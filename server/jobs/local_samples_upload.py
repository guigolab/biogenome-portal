from __future__ import annotations

import logging
import os
from typing import Set

from celery import shared_task, states

from db.model import BioGenomeUser, LocalSample, Organism
from helpers import data as data_helper, geolocation as geoloc_helper, user as user_helper
from helpers.upload_temp import safe_unlink
from jobs.organisms import fetch_tolid_prefixes_task
from jobs.support.organism_catalog_sync import (
    finalize_organism_catalog_for_taxids,
    import_missing_organisms_for_taxids,
    species_upload_permission_errors,
)
from jobs.support.local_samples_spreadsheet import (
    is_allowed_local_samples_upload_path,
    load_mapped_samples_from_xlsx_path,
)

logger = logging.getLogger(__name__)

TMP_DIR = os.getenv("TMP_DIR", "/tmp")


def _progress(self, messages: list[str]):
    """Expose human-readable status for GET /api/tasks/<task_id> polling."""
    self.update_state(state=states.STARTED, meta={"messages": messages})


@shared_task(name="samples_upload", ignore_result=False, bind=True)
def upload_samples_spreadsheet(
    self,
    username,
    spreadsheet_path,
    option="SKIP",
    source=None,
    header=1,
    id=None,
    taxid=None,
    scientific_name=None,
):
    """
    Process a spreadsheet saved under TMP_DIR by the REST upload handler.
    ``spreadsheet_path`` keeps Celery/Redis payloads small; the file is removed when done.
    """
    samples_updated = 0
    samples_created = 0
    samples_skipped = 0
    total_samples = 0
    taxids_to_sync: Set[str] = set()
    saved_organism_taxids_from_ena: list[str] = []
    created_taxids_for_user: list = []

    _progress(self, ["Starting job...", "Reading spreadsheet"])

    def _raise_errors(errors: list[str], prefix: str | None = None) -> None:
        parts = [e for e in errors if e]
        if prefix:
            parts.insert(0, prefix)
        raise ValueError("\n".join(parts))

    if not is_allowed_local_samples_upload_path(spreadsheet_path, TMP_DIR):
        raise ValueError("Invalid or missing spreadsheet path.")

    try:
        mapped_sample_dicts, parse_errors = load_mapped_samples_from_xlsx_path(
            spreadsheet_path, header, id, taxid, scientific_name, option, source
        )
    except Exception:
        logger.exception("Could not read local samples spreadsheet")
        raise
    finally:
        safe_unlink(spreadsheet_path)

    if parse_errors:
        if isinstance(parse_errors, list):
            _raise_errors([str(e) for e in parse_errors], "Spreadsheet validation failed:")
        raise ValueError(f"Spreadsheet validation failed.\n{parse_errors}")

    user = BioGenomeUser.objects(name=username).first()
    if not user:
        raise ValueError("User not found")

    taxids = list({str(s.get("taxid")) for s in mapped_sample_dicts if s.get("taxid")})
    perm_errors = species_upload_permission_errors(user, taxids)
    if perm_errors:
        _raise_errors([str(e) for e in perm_errors], "Taxonomy permission errors:")

    mapped_samples = [LocalSample(user=user.name, **s) for s in mapped_sample_dicts]
    total_samples = len(mapped_samples)
    pre_existing_samples = LocalSample.objects(
        local_id__in=[s.local_id for s in mapped_samples]
    )

    if option == "UPDATE":
        _progress(
            self,
            [
                f"Updating existing rows ({len(pre_existing_samples)} matched by local_id)...",
            ],
        )

        for existing_sample in pre_existing_samples:
            for s in mapped_samples:
                if s.local_id == existing_sample.local_id:
                    existing_sample.update(
                        taxid=s.taxid, broker=source, metadata=s.metadata
                    )
                    existing_sample.reload()
                    geoloc_helper.save_coordinates(existing_sample, "local_id")
                    geoloc_helper.update_countries_from_biosample(
                        existing_sample, existing_sample.local_id
                    )
                    taxids_to_sync.add(str(s.taxid))

        samples_updated = len(pre_existing_samples)
    else:
        samples_skipped = len(pre_existing_samples)

    pre_existing_id_list = pre_existing_samples.scalar("local_id")

    new_mapped_sample_list = [
        s for s in mapped_samples if s.local_id not in pre_existing_id_list
    ]

    missing_taxids: list[str] = []
    if new_mapped_sample_list:
        new_taxids = sorted(
            {str(s.taxid) for s in new_mapped_sample_list if getattr(s, "taxid", None)}
        )
        if new_taxids:
            _progress(
                self,
                [
                    f"Fetching taxonomy for {len(new_taxids)} new species (ENA bulk)...",
                ],
            )
            try:
                import_result = import_missing_organisms_for_taxids(
                    new_taxids,
                    TMP_DIR,
                    reload_organism_dependencies=True,
                )
                saved_organism_taxids_from_ena = list(import_result.saved_organism_taxids)
                taxids_to_sync.update(
                    str(t) for t in import_result.saved_organism_taxids if t
                )
            except Exception:
                logger.exception(
                    "Post-upload taxonomy import failed after local samples spreadsheet parse"
                )
                raise

            allowed_taxids = import_result.allowed_taxids
            missing_taxids = [str(t) for t in import_result.missing_taxids if t]
        else:
            allowed_taxids = frozenset()

        before_filter = len(new_mapped_sample_list)
        new_mapped_sample_list = [
            s
            for s in new_mapped_sample_list
            if getattr(s, "taxid", None) and str(s.taxid) in allowed_taxids
        ]
        dropped = before_filter - len(new_mapped_sample_list)
        if dropped:
            samples_skipped += dropped
            logger.warning(
                "Skipped %s new local sample row(s): no Organism for taxid after ENA import",
                dropped,
            )

        if new_mapped_sample_list:
            _progress(
                self,
                [f"Inserting {len(new_mapped_sample_list)} new samples (bulk)..."],
            )

            to_insert = list(new_mapped_sample_list)
            try:
                LocalSample.objects.insert(to_insert)
            except Exception:
                logger.exception(
                    "Bulk LocalSample insert failed; retrying per document"
                )
                to_insert = []
                for mapped_sample in new_mapped_sample_list:
                    try:
                        mapped_sample.save()
                        to_insert.append(mapped_sample)
                    except Exception as e:
                        messages = [
                            "Job completed with the following stats",
                            f"TOTAL SAMPLES: {total_samples}",
                            f"SAMPLES CREATED {samples_created}",
                            f"SAMPLES UPDATED {samples_updated}",
                            f"SAMPLES SKIPPED {samples_skipped}",
                        ]
                        messages.append(
                            f"Error for sample: {mapped_sample.local_id} of species "
                            f"{mapped_sample.scientific_name}: {e}"
                        )
                        raise RuntimeError("\n".join(messages)) from e

            taxids_for_lineage = sorted(
                {str(s.taxid) for s in to_insert if getattr(s, "taxid", None)}
            )
            org_by_taxid = {
                str(o.taxid): o
                for o in Organism.objects(taxid__in=taxids_for_lineage).only(
                    "taxid", "taxon_lineage"
                )
            }

            for mapped_sample in to_insert:
                try:
                    samples_created += 1
                    created_taxids_for_user.append(mapped_sample.taxid)
                    taxids_to_sync.add(str(mapped_sample.taxid))
                    geoloc_helper.save_coordinates(mapped_sample, "local_id")
                    geoloc_helper.update_countries_from_biosample(
                        mapped_sample, mapped_sample.local_id
                    )
                    organism = org_by_taxid.get(str(mapped_sample.taxid))
                    if organism:
                        data_helper.update_lineage(
                            mapped_sample, organism, skip_sync=True
                        )
                except Exception as e:
                    messages = [
                        "Job completed with the following stats",
                        f"TOTAL SAMPLES: {total_samples}",
                        f"SAMPLES CREATED {samples_created}",
                        f"SAMPLES UPDATED {samples_updated}",
                        f"SAMPLES SKIPPED {samples_skipped}",
                    ]
                    messages.append(
                        f"Error for sample: {mapped_sample.local_id} of species "
                        f"{mapped_sample.scientific_name}: {e}"
                    )
                    raise RuntimeError("\n".join(messages)) from e

            _progress(
                self,
                [f"Saved {samples_created} new samples; finalizing..."],
            )

    if taxids_to_sync:
        finalize_organism_catalog_for_taxids(
            sorted(taxids_to_sync),
            copy_lineages=False,
        )
    if saved_organism_taxids_from_ena:
        fetch_tolid_prefixes_task.delay(saved_organism_taxids_from_ena)

    if created_taxids_for_user:
        user_helper.add_species_to_datamanager(created_taxids_for_user, user)

    records_saved = samples_created + samples_updated
    return {
        "messages": [f"Saved {records_saved} sample record(s)."],
        "summary": {
            "records_total": total_samples,
            "records_saved": records_saved,
            "records_skipped_or_not_found": samples_skipped,
            "created_organisms": len(saved_organism_taxids_from_ena),
        },
        "saved_samples_count": records_saved,
        "created_samples_count": samples_created,
        "updated_samples_count": samples_updated,
        "created_taxids": [str(t) for t in saved_organism_taxids_from_ena if t],
        "skipped_or_not_found_taxids": missing_taxids,
        "errors": [],
    }
