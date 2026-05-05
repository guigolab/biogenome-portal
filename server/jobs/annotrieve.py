"""Async ingestion helpers for GFF annotations from Annotrieve."""

from celery import shared_task

from db.model import Assembly
from jobs.support.annotrieve import sync_annotrieve_annotations_for_assembly_accessions
from jobs.taxonomy import cleanup_catalog_outside_root_lineage

@shared_task(name="annotations_import_from_annotrieve", ignore_result=False)
def import_annotations_from_annotrieve():
    accessions = Assembly.objects().scalar("accession")
    if not accessions:
        return {
            "status": "no_assemblies",
            "annotations_upserted": 0,
            "assembly_accession_batches": 0,
            "assembly_accessions": 0,
            "taxids_synced": 0,
            "root_lineage_cleanup": cleanup_catalog_outside_root_lineage(),
        }
    result = sync_annotrieve_annotations_for_assembly_accessions(accessions)
    result["root_lineage_cleanup"] = cleanup_catalog_outside_root_lineage()
    return result

