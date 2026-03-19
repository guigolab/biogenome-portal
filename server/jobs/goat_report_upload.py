import logging
import os

from db.models import Organism, BioGenomeUser, Publication
from db.enums import GoaTStatus, PublicationSource
from helpers import organism as organism_helper, user as user_helper
from helpers.goat_report import (
    is_allowed_goat_upload_path,
    load_goat_report_rows_from_path,
    safe_unlink,
)
from celery import shared_task, states
from celery.exceptions import Ignore

logger = logging.getLogger(__name__)

TMP_DIR = os.getenv("TMP_DIR", "/tmp")

GOAT_STATUS_IMPORT_MAPPER = {
    "sample_collected": GoaTStatus.SAMPLE_COLLECTED.value,
    "sample_acquired": GoaTStatus.SAMPLE_ACQUIRED.value,
    "data_generation": GoaTStatus.DATA_GENERATION.value,
    "in_assembly": GoaTStatus.IN_ASSEMBLY.value,
    "insdc_submitted": GoaTStatus.INSDC_SUBMITTED.value,
    "publication_available": GoaTStatus.PUBLICATION_AVAILABLE.value,
}


@shared_task(name="goat_upload", ignore_result=False, bind=True)
def upload_goat_report(self, username, report_path, sub_project=None):
    """
    Process a GoaT report file saved under TMP_DIR by the REST upload handler.
    ``report_path`` keeps Celery/Redis payloads small; the file is removed when done.
    """
    updated_organisms = []
    self.update_state(state=states.PENDING, meta={"messages": ["Starting job..."]})

    if not is_allowed_goat_upload_path(report_path, TMP_DIR):
        self.update_state(
            state="FAILURE",
            meta={"messages": ["Invalid or missing report file path."]},
        )
        # Do not unlink: path failed safety checks and may not be our temp file.
        return {"messages": ["Invalid or missing report file path."]}

    try:
        rows, sub_from_file = load_goat_report_rows_from_path(report_path)
        if sub_project is None:
            sub_project = sub_from_file
    except Exception as e:
        self.update_state(
            state="FAILURE",
            meta={"messages": [f"Could not read report file: {e}"]},
        )
        raise
    finally:
        safe_unlink(report_path)

    # Stable order, unique taxids — avoids oversized $in and duplicate ENA work
    taxid_list = []
    seen = set()
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
    new_taxid_list = [taxid for taxid in taxid_list if taxid not in existing_set]

    valid_rows = list(rows)
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
        # Streaming XML + bulk inserts; tolid sync skipped (old path did not fetch tolid)
        saved_taxids = organism_helper.handle_full_taxonomy_from_taxids(
            new_taxid_list, TMP_DIR, fetch_tolid_prefixes_sync=False
        )
        saved_set = set(saved_taxids)
        if saved_taxids:
            logger.info("Created %s new organism(s) from INSDC/ENA", len(saved_taxids))
            self.update_state(
                state=states.PENDING,
                meta={"messages": [f"Created {len(saved_taxids)} new organisms from INSDC/ENA."]},
            )

            missing_taxid_list = [taxid for taxid in new_taxid_list if taxid not in saved_set]
            if missing_taxid_list:
                logger.info(
                    "%s organism(s) not found in INSDC; skipping related rows",
                    len(missing_taxid_list),
                )
                self.update_state(
                    state=states.PENDING,
                    meta={
                        "messages": [
                            f"{len(missing_taxid_list)} taxa not found in INSDC; skipping those rows."
                        ]
                    },
                )
                missing_set = set(missing_taxid_list)
                valid_rows = [
                    row
                    for row in rows
                    if str(row.get("ncbi_taxon_id") or "") not in missing_set
                ]
        else:
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
        return {"messages": ["No mappable rows after filtering."]}

    taxids_to_update = list(rows_map.keys())
    self.update_state(
        state=states.PENDING,
        meta={"messages": [f"Loading {len(taxids_to_update)} organisms for update..."]},
    )

    organisms_by_taxid = {
        o.taxid: o for o in Organism.objects(taxid__in=taxids_to_update)
    }

    total = len(taxids_to_update)
    progress_every = max(1, min(100, total // 20 or 1))

    for i, taxid in enumerate(taxids_to_update):
        org = organisms_by_taxid.get(taxid)
        if not org:
            continue

        if i % progress_every == 0:
            self.update_state(
                state=states.PENDING,
                meta={
                    "messages": [
                        f"Updating organisms ({i + 1}/{total}) — current: {org.scientific_name}"
                    ]
                },
            )

        data_to_update = rows_map[taxid]
        publication = data_to_update.get("publications")
        org.target_list_status = data_to_update.get("target_list_status")
        org.goat_status = data_to_update.get("goat_status")
        org.sub_project = sub_project
        if publication and not any(pub.id == publication.id for pub in (org.publications or [])):
            if org.publications is None:
                org.publications = []
            org.publications.append(publication)
        try:
            org.save()
            updated_organisms.append(org.scientific_name)
        except Exception as e:
            messages = []
            if updated_organisms:
                messages.append(f"Species saved {' ;'.join(updated_organisms)}")
            messages.append(f"Error for organism: {org.scientific_name}: {e}")
            self.update_state(state="ERROR", meta={"messages": messages})
            raise Ignore()

    self.update_state(
        state=states.PENDING,
        meta={"messages": [f"Finished updating {len(updated_organisms)} organisms."]},
    )
    user = BioGenomeUser.objects(name=username).first()
    # Same as original: only taxids that actually exist on Organism documents
    user_helper.add_species_to_datamanager(list(organisms_by_taxid.keys()), user)

    return {"messages": [f"Species saved {' ;'.join(updated_organisms)}"]}


def map_rows(rows):
    rows_map = {}
    for row in rows:
        tid = row.get("ncbi_taxon_id")
        if tid is None or tid == "":
            continue
        taxid = str(tid)
        entry = {}
        seq_status = row.get("sequencing_status")
        if seq_status and seq_status in GOAT_STATUS_IMPORT_MAPPER:
            entry["goat_status"] = GOAT_STATUS_IMPORT_MAPPER[seq_status]
        entry["target_list_status"] = row.get("target_list_status")

        if row.get("publication_id"):
            entry["publications"] = map_publication(row.get("publication_id"))

        rows_map[taxid] = entry
    return rows_map


def map_publication(pub):
    publication_to_save = Publication()
    if "/" in pub:
        publication_to_save.source = PublicationSource.DOI
    elif "PMC" in pub:
        publication_to_save.source = PublicationSource.PMCID
    else:
        publication_to_save.source = PublicationSource.PMID
    publication_to_save.id = pub
    return publication_to_save
