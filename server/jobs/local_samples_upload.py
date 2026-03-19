import os

from db.models import LocalSample, BioGenomeUser
from helpers.taxon_organism_sync import sync_many_taxids
from helpers import (
    organism as organism_helper,
    user as user_helper,
    geolocation as geoloc_helper,
    data as data_helper,
)
from helpers.goat_report import safe_unlink
from helpers.local_samples_upload import (
    is_allowed_local_samples_upload_path,
    load_mapped_samples_from_xlsx_path,
)
from celery import shared_task, states
from celery.exceptions import Ignore

OPTIONS = ["SKIP", "UPDATE"]
TMP_DIR = os.getenv("TMP_DIR", "/tmp")

"""
STEPS:
    VALIDATE HEADER
    VALIDATE OPTION
    VALIDATE ROWS
    VALIDATE USER PERMISSIONS
    MAP SAMPLES
    RETRIEVE TAXONS
    CREATE TAXONS
    SAVE SAMPLES
    UPDATE TAXONS
"""


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
    new_mapped_samples = []

    self.update_state(state=states.PENDING, meta={"messages": ["Starting job..."]})

    if not is_allowed_local_samples_upload_path(spreadsheet_path, TMP_DIR):
        self.update_state(
            state="FAILURE",
            meta={"messages": ["Invalid or missing spreadsheet path."]},
        )
        return {"messages": ["Invalid or missing spreadsheet path."]}

    try:
        mapped_sample_dicts, parse_errors = load_mapped_samples_from_xlsx_path(
            spreadsheet_path, header, id, taxid, scientific_name, option, source
        )
    except Exception as e:
        self.update_state(
            state="FAILURE",
            meta={"messages": [f"Could not read spreadsheet: {e}"]},
        )
        raise
    finally:
        safe_unlink(spreadsheet_path)

    if parse_errors:
        self.update_state(
            state="FAILURE",
            meta={"messages": ["Spreadsheet validation failed.", str(parse_errors)]},
        )
        return {"messages": ["Spreadsheet validation failed."]}

    user = BioGenomeUser.objects(name=username).first()

    mapped_samples = [LocalSample(user=user.name, **s) for s in mapped_sample_dicts]
    total_samples = len(mapped_samples)
    pre_existing_samples = LocalSample.objects(
        local_id__in=[s.local_id for s in mapped_samples]
    )

    if option == "UPDATE":
        # QuerySet.update does not fire LocalSample post_save; organism/taxon aggregates may lag until next related save.
        self.update_state(
            state=states.PENDING,
            meta={
                "messages": [
                    f"Found a total of new {len(pre_existing_samples)} samples to save"
                ]
            },
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

        samples_updated = len(pre_existing_samples)
    else:
        samples_skipped = len(pre_existing_samples)

    pre_existing_id_list = pre_existing_samples.scalar("local_id")

    new_mapped_sample_list = [
        s for s in mapped_samples if s.local_id not in pre_existing_id_list
    ]

    if new_mapped_sample_list:
        new_mapped_samples = (
            organism_helper.handle_taxonomic_ids(new_mapped_sample_list) or []
        )

        if new_mapped_samples:
            self.update_state(
                state=states.PENDING,
                meta={
                    "messages": [
                        f"Found a total of new {len(new_mapped_samples)} samples to save"
                    ]
                },
            )

            created_taxids: list = []
            for mapped_sample in new_mapped_samples:
                try:
                    saved_sample = LocalSample(**mapped_sample).save()
                    samples_created += 1
                    created_taxids.append(saved_sample.taxid)
                    geoloc_helper.save_coordinates(saved_sample, "local_id")
                    geoloc_helper.update_countries_from_biosample(
                        saved_sample, saved_sample.local_id
                    )
                    organism = organism_helper.handle_organism(saved_sample.taxid)
                    data_helper.update_lineage(saved_sample, organism, skip_sync=True)
                except Exception as e:
                    messages = [
                        "Job completed with the following stats",
                        f"TOTAL SAMPLES: {total_samples}",
                        f"SAMPLES CREATED {samples_created}",
                        f"SAMPLES UPDATED {samples_updated}",
                        f"SAMPLES SKIPPED {samples_skipped}",
                    ]
                    messages.append(
                        f"Error for sample: {mapped_sample['local_id']} of species "
                        f"{mapped_sample['scientific_name']}: {e}"
                    )
                    self.update_state(state="ERROR", meta={"messages": messages})
                    raise Ignore()

            if created_taxids:
                sync_many_taxids(created_taxids)

            self.update_state(
                state=states.PENDING,
                meta={
                    "messages": [
                        f"A total of {samples_created} new samples have been saved"
                    ]
                },
            )

            samples_skipped = len(new_mapped_samples) - samples_created

    user_helper.add_species_to_datamanager(
        [s.taxid for s in new_mapped_samples], user
    )

    return {
        "messages": [
            "Job completed with the following stats",
            f"TOTAL SAMPLES: {total_samples}",
            f"SAMPLES CREATED {samples_created}",
            f"SAMPLES UPDATED {samples_updated}",
            f"SAMPLES SKIPPED {samples_skipped}",
        ]
    }
