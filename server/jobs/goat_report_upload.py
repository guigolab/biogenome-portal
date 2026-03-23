from __future__ import annotations

import logging
import os

from celery import shared_task, states

from db.constants import GOAT_PROJECT_NAME
from db.model import BioGenomeUser, Organism
from helpers import user as user_helper
from helpers.upload_temp import safe_unlink
from jobs.organisms import fetch_tolid_prefixes_task
from jobs.support.organism_catalog_sync import (
    bulk_apply_goat_report_updates,
    finalize_organism_catalog_for_taxids,
    import_missing_organisms_for_taxids,
    species_upload_permission_errors,
)
from jobs.support.goat_report_file import (
    is_allowed_goat_upload_path,
    load_goat_report_rows_from_path,
    map_rows,
    validate_goat_report_rows,
)

logger = logging.getLogger(__name__)

TMP_DIR = os.getenv("TMP_DIR", "/tmp")


@shared_task(name="goat_upload", ignore_result=False, bind=True)
def upload_goat_report(self, username, report_path, sub_project=None):
    """
    Process a GoaT report file saved under TMP_DIR by the REST upload handler.
    ``report_path`` keeps Celery/Redis payloads small; the file is removed when done.
    """
    self.update_state(state=states.PENDING, meta={"messages": ["Starting job..."]})

    if not is_allowed_goat_upload_path(report_path, TMP_DIR):
        raise ValueError("Invalid or missing report file path.")

    if not GOAT_PROJECT_NAME:
        raise ValueError("GOAT_PROJECT_NAME is not configured.")

    def _raise_errors(errors: list[str], prefix: str | None = None) -> None:
        parts = [e for e in errors if e]
        if prefix:
            parts.insert(0, prefix)
        raise ValueError("\n".join(parts))

    try:
        rows, sub_from_file = load_goat_report_rows_from_path(report_path)
        if sub_project is None:
            sub_project = sub_from_file

        validation_errors = validate_goat_report_rows(rows)
        if validation_errors:
            _raise_errors(validation_errors, "Validation errors:")

        user = BioGenomeUser.objects(name=username).first()
        if not user:
            raise ValueError("User not found")

        taxids_in_file = [
            str(row.get("ncbi_taxon_id"))
            for row in rows
            if row.get("ncbi_taxon_id") not in (None, "")
        ]
        perm_errors = species_upload_permission_errors(user, taxids_in_file)
        if perm_errors:
            _raise_errors(perm_errors, "Taxonomy permission errors:")

    except Exception:
        logger.exception("Could not read or validate GoaT report file")
        raise
    finally:
        safe_unlink(report_path)

    taxid_list: list[str] = []
    seen: set[str] = set()
    for row in rows:
        tid = row.get("ncbi_taxon_id")
        if tid is None or tid == "":
            continue
        s = str(tid)
        if s not in seen:
            seen.add(s)
            taxid_list.append(s)

    if not taxid_list:
        self.update_state(
            state=states.PENDING,
            meta={"messages": ["No valid ncbi_taxon_id values in upload; nothing to do."]},
        )
        return {"messages": ["No valid taxids in file."]}

    existing_taxid_list = Organism.objects(taxid__in=taxid_list).scalar("taxid")
    existing_set = set(existing_taxid_list)
    new_taxid_list = [t for t in taxid_list if t not in existing_set]

    valid_rows = list(rows)
    missing_taxids: list[str] = []
    saved_organism_taxids: list[str] = []

    if new_taxid_list:
        logger.info("New organisms to save: %s", len(new_taxid_list))
        self.update_state(
            state=states.PENDING,
            meta={
                "messages": [
                    f"Found {len(new_taxid_list)} new organisms; fetching taxonomy from ENA (bulk)..."
                ]
            },
        )
        try:
            import_result = import_missing_organisms_for_taxids(
                new_taxid_list,
                TMP_DIR,
                reload_organism_dependencies=True,
            )
        except Exception:
            logger.exception("GoaT upload: taxonomy import failed for new taxids")
            raise

        saved_organism_taxids = import_result.saved_organism_taxids
        if saved_organism_taxids:
            logger.info("Created %s new organism(s) from INSDC/ENA", len(saved_organism_taxids))
            self.update_state(
                state=states.PENDING,
                meta={
                    "messages": [
                        f"Created {len(saved_organism_taxids)} new organisms from INSDC/ENA."
                    ]
                },
            )

        if import_result.missing_taxids:
            missing_taxids = [str(t) for t in import_result.missing_taxids if t]
            missing_set = set(missing_taxids)
            logger.info(
                "%s organism(s) not found in INSDC; skipping related rows",
                len(missing_set),
            )
            self.update_state(
                state=states.PENDING,
                meta={
                    "messages": [
                        f"{len(missing_set)} taxa not found in INSDC; skipping those rows."
                    ]
                },
            )
            valid_rows = [
                row
                for row in rows
                if str(row.get("ncbi_taxon_id") or "") not in missing_set
            ]
        elif not saved_organism_taxids and new_taxid_list:
            logger.warning("No organisms returned from ENA for new taxids")
            self.update_state(
                state=states.PENDING,
                meta={
                    "messages": [
                        f"No organisms could be created from INSDC for {len(new_taxid_list)} new taxids."
                    ]
                },
            )

    rows_map = map_rows(valid_rows)
    if not rows_map:
        return {
            "messages": ["No mappable rows after filtering."],
            "summary": {
                "records_total": len(rows),
                "records_saved": 0,
                "records_skipped_or_not_found": len(rows),
                "created_organisms": len(saved_organism_taxids),
            },
            "saved_taxids": [],
            "created_taxids": saved_organism_taxids,
            "skipped_or_not_found_taxids": missing_taxids,
            "errors": [],
        }

    taxids_to_update = list(rows_map.keys())
    self.update_state(
        state=states.PENDING,
        meta={"messages": [f"Bulk-updating {len(taxids_to_update)} organisms..."]},
    )

    try:
        updated_organisms, taxids_updated = bulk_apply_goat_report_updates(
            rows_map, sub_project
        )
    except Exception:
        logger.exception("GoaT bulk organism update failed")
        raise

    sync_taxids = sorted(set(taxids_updated) | {str(t) for t in saved_organism_taxids if t})
    if sync_taxids:
        finalize_organism_catalog_for_taxids(
            sync_taxids,
            copy_lineages=False,
            apply_goat_inference=False,
        )
    if saved_organism_taxids:
        fetch_tolid_prefixes_task.delay(list(saved_organism_taxids))

    self.update_state(
        state=states.PENDING,
        meta={
            "messages": [
                f"Finished updating {len(updated_organisms)} organisms (bulk write + species sync)."
            ]
        },
    )

    organisms_for_user = Organism.objects(taxid__in=list(rows_map.keys())).scalar("taxid")
    user_helper.add_species_to_datamanager([str(t) for t in organisms_for_user if t], user)

    records_saved = len(updated_organisms)
    records_total = len(rows)
    records_skipped_or_not_found = max(records_total - records_saved, 0)
    return {
        "messages": [f"Saved {records_saved} organism record(s)."],
        "summary": {
            "records_total": records_total,
            "records_saved": records_saved,
            "records_skipped_or_not_found": records_skipped_or_not_found,
            "created_organisms": len(saved_organism_taxids),
        },
        "saved_taxids": [str(t) for t in taxids_updated if t],
        "created_taxids": [str(t) for t in saved_organism_taxids if t],
        "skipped_or_not_found_taxids": missing_taxids,
        "errors": [],
    }
