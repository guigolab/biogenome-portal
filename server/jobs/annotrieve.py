"""Async ingestion helpers for GFF annotations from Annotrieve."""

from celery import shared_task

from db.model import Assembly
from jobs.support.annotrieve_ingest import run_annotrieve_import_for_accessions


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
        }
    return run_annotrieve_import_for_accessions(accessions)


@shared_task(name="annotations_import_for_assembly_accessions", ignore_result=False)
def import_annotations_for_assembly_accessions(accessions=None):
    """
    Fetch Annotrieve annotations for the given assembly accessions and upsert
    ``GenomeAnnotation`` rows, then finalize touched species catalog entries.
    """
    return run_annotrieve_import_for_accessions(accessions or [])
