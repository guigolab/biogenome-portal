"""
MongoEngine signal handlers for documents defined in ``db.documents``.

Imported as a side effect when loading ``db.models`` so the rest of the codebase can keep
using ``from db.models import ...`` while helpers import ``db.documents`` without cycles.
"""

import os
from contextvars import ContextVar

import mongoengine as db

from db.documents import (
    Assembly,
    BioGenomeUser,
    BioSample,
    BioSampleSubmission,
    Chromosome,
    GenomeAnnotation,
    GoaTUpdateDate,
    LocalSample,
    Organism,
    OrganismAuditLog,
    OrganismNames,
    OrganismPublication,
    ReadRun,
    SampleCoordinates,
    TaxonNode,
)
from helpers.organism_status import fetch_related_counts, refresh_organism_status_fields
from helpers.taxon_organism_sync import sync_organism_status_and_taxon_counts, trigger_organism_update
from helpers.taxonomy import update_taxon_node_counts_for_taxids

GOAT_PROJECT_NAME = os.getenv("GOAT_PROJECT_NAME")

# When deleting an Organism we bulk-delete children; skip per-child taxon refresh / organism.save()
# until the final update_taxons() pass (intermediate counts would be wrong).
_skip_cascade_hooks: ContextVar[bool] = ContextVar("_skip_cascade_hooks", default=False)


def update_organism_status(sender, document, **kwargs):
    counts = fetch_related_counts(document.taxid)
    refresh_organism_status_fields(
        document,
        counts,
        goat_project_name=GOAT_PROJECT_NAME,
    )


def _after_related_entity_deleted(taxid, taxon_lineage):
    """Refresh organism denormalized fields and TaxonNode aggregate counts."""
    if _skip_cascade_hooks.get():
        return
    if taxid:
        trigger_organism_update(str(taxid))
    if taxon_lineage:
        update_taxon_node_counts_for_taxids(taxon_lineage)


def sync_related_post_save(sender, document, **kwargs):
    """After create/update of related data: refresh organism status and TaxonNode counts."""
    taxid = getattr(document, "taxid", None)
    if not taxid:
        return
    lineage = getattr(document, "taxon_lineage", None)
    sync_organism_status_and_taxon_counts(
        str(taxid),
        list(lineage) if lineage else None,
    )


def delete_genome_annotation_sync(sender, document, **kwargs):
    _after_related_entity_deleted(document.taxid, document.taxon_lineage or [])


def update_taxons(lineage):
    for node in lineage:
        organisms_count = Organism.objects(taxon_lineage=node.taxid).count()
        if organisms_count == 0:
            TaxonNode.objects(children=node.taxid).update(pull__children=node.taxid)
            node.delete()
            continue
        assemblies_count = Assembly.objects(taxid=node.taxid).count()
        reads_count = ReadRun.objects(taxid=node.taxid).count()
        biosamples_count = BioSample.objects(taxid=node.taxid).count()
        local_samples_count = LocalSample.objects(taxid=node.taxid).count()
        submitted_biosamples_count = BioSampleSubmission.objects(taxid=node.taxid).count()
        genome_annotations_count = GenomeAnnotation.objects(taxid=node.taxid).count()
        node.modify(
            organisms_count=organisms_count,
            assemblies_count=assemblies_count,
            reads_count=reads_count,
            biosamples_count=biosamples_count,
            local_samples_count=local_samples_count,
            submitted_biosamples_count=submitted_biosamples_count,
            genome_annotations_count=genome_annotations_count,
        )


def delete_organism_related_data(sender, document):
    taxid = document.taxid
    lineage = document.taxon_lineage or []
    token = _skip_cascade_hooks.set(True)
    try:
        ReadRun.objects(taxid=taxid).delete()
        Assembly.objects(taxid=taxid).delete()
        GenomeAnnotation.objects(taxid=taxid).delete()
        LocalSample.objects(taxid=taxid).delete()
        BioSample.objects(taxid=taxid).delete()
        BioSampleSubmission.objects(taxid=taxid).delete()
        SampleCoordinates.objects(taxid=taxid).delete()
        GoaTUpdateDate.objects(taxid=taxid).delete()
        OrganismPublication.objects(taxid=taxid).delete()
        OrganismNames.objects(taxid=taxid).delete()
        OrganismAuditLog.objects(taxid=taxid).delete()
        BioGenomeUser.objects(species=taxid).update(pull__species=taxid)
    finally:
        _skip_cascade_hooks.reset(token)
    update_taxons(TaxonNode.objects(taxid__in=lineage))


def delete_biosample_related_data(sender, document):
    accession = document.accession
    taxon_lineage = document.taxon_lineage or []
    reads_accessions = list(
        ReadRun.objects(sample_accession=accession).scalar("run_accession")
    )
    Assembly.objects(sample_accession=accession).delete()
    if reads_accessions:
        ReadRun.objects(run_accession__in=reads_accessions).delete()
    SampleCoordinates.objects(sample_accession=accession).delete()
    _after_related_entity_deleted(document.taxid, taxon_lineage)


def delete_local_sample_related_data(sender, document):
    SampleCoordinates.objects(sample_accession=document.local_id).delete()
    _after_related_entity_deleted(document.taxid, document.taxon_lineage or [])


def delete_assembly_related_data(sender, document):
    accession = document.accession
    if document.chromosomes:
        Chromosome.objects(accession_version__in=document.chromosomes).delete()
    GenomeAnnotation.objects(assembly_accession=accession).delete()
    _after_related_entity_deleted(document.taxid, document.taxon_lineage or [])


def delete_readrun_related_data(sender, document, **kwargs):
    _after_related_entity_deleted(document.taxid, document.taxon_lineage or [])


def register_signals() -> None:
    db.pre_save.connect(update_organism_status, sender=Organism)

    for sender in (
        ReadRun,
        Assembly,
        LocalSample,
        BioSample,
        BioSampleSubmission,
        GenomeAnnotation,
    ):
        db.post_save.connect(sync_related_post_save, sender=sender)

    db.post_delete.connect(delete_genome_annotation_sync, sender=GenomeAnnotation)
    db.post_delete.connect(delete_organism_related_data, sender=Organism)
    db.post_delete.connect(delete_biosample_related_data, sender=BioSample)
    db.post_delete.connect(delete_local_sample_related_data, sender=LocalSample)
    db.post_delete.connect(delete_assembly_related_data, sender=Assembly)
    db.post_delete.connect(delete_readrun_related_data, sender=ReadRun)


register_signals()
