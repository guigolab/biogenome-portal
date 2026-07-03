"""
REST-triggered catalog sync and cascading deletes (replaces removed MongoEngine signals).

Call these helpers from REST services (and from other code paths such as Celery tasks) after
catalog writes or when performing deletes that used to rely on ``post_delete`` handlers.

**Breaking change:** Any code that still calls ``.save()`` or ``.delete()`` on catalog models
without invoking the appropriate function here will not refresh Organism denormalized fields,
TaxonNode aggregates, or run cascade deletes until it is updated.

Celery tasks and maintenance scripts that delete catalog rows directly should call the
relevant cascade helper (e.g. ``cascade_delete_experiment`` when removing a legacy
``Experiment`` document) instead of bare ``.delete()`` where parity with the old signal
handlers matters. Read-level data lives in ``ReadRun``.
"""

from __future__ import annotations

import datetime
from typing import Any, Iterable, Optional, Union

from db.constants import GOAT_PROJECT_NAME
from db.model import (
    Assembly,
    BioGenomeUser,
    BioSample,
    Chromosome,
    GenomeAnnotation,
    GoaTUpdateDate,
    LocalSample,
    Organism,
    Read,
    ReadRun,
    SampleCoordinates,
    TaxonNode,
)

from helpers.organism_denorm_pure import (
    MergeContext,
    RelatedCounts,
    derive_organism_denorm,
)
from jobs.support.goat_status import has_genome_publication_set


def fetch_related_counts(taxid: str) -> RelatedCounts:
    return RelatedCounts(
        assemblies=Assembly.objects(taxid=taxid).count(),
        reads=ReadRun.objects(taxid=taxid).count(),
        biosamples=BioSample.objects(taxid=taxid).count(),
        local_samples=LocalSample.objects(taxid=taxid).count(),
        genome_annotations=GenomeAnnotation.objects(taxid=taxid).count(),
    )


def touch_goat_update_date(
    taxid: str, when: Optional[datetime.datetime] = None
) -> None:
    """Persist GoaT last-updated timestamp for one species taxid."""
    stamp = when or datetime.datetime.now()
    GoaTUpdateDate.objects(taxid=str(taxid)).update_one(
        set__updated=stamp,
        set__taxid=str(taxid),
        upsert=True,
    )


def refresh_organism_status_fields(
    document: Any,
    counts: RelatedCounts,
    *,
    goat_project_name: Optional[str],
    now: Optional[datetime.datetime] = None,
    apply_goat_inference: bool = True,
    merge_context: MergeContext = "default",
) -> None:
    """
    Mutate document (Organism) in place before ``save()``.

    When ``apply_goat_inference`` is False, denormalized **counts** still update; GoaT
    inference is skipped. Inference also does nothing when ``goat_project_name`` is
    unset (no ``GOAT_PROJECT_NAME`` env).

    ``Organism.insdc_status`` is not written here (deprecated; no longer derived from
    catalog counts on recount).
    """
    derived = derive_organism_denorm(
        counts,
        current_goat_status=getattr(document, "goat_status", None),
        has_genome_publication=has_genome_publication_set(document),
        goat_project_name=goat_project_name,
        apply_goat_inference=apply_goat_inference,
        merge_context=merge_context,
    )
    document.assemblies_count = derived.assemblies_count
    document.reads_count = derived.reads_count
    document.biosamples_count = derived.biosamples_count
    document.local_samples_count = derived.local_samples_count
    document.genome_annotations_count = derived.genome_annotations_count
    if derived.update_goat_field and derived.goat_status is not None:
        document.goat_status = derived.goat_status
    if derived.touch_goat_update_date:
        touch_goat_update_date(document.taxid, now)


def refresh_taxon_counts_for_taxid_lineage(
    taxid: str, lineage_fallback: Optional[Iterable[str]] = None
) -> None:
    """
    Recompute :class:`~db.model.TaxonNode` roll-up counters for this species taxid and
    every lineage key that touches it (same node set as :func:`sync_species_after_catalog_change`
    would affect via bulk stats).

    Loads lineage from the species :class:`~db.model.Organism` when present; merges
    ``lineage_fallback`` (e.g. from the catalog row being synced) so counts still update
    if the organism or its ``taxon_lineage`` is missing.
    """
    tid = str(taxid).strip()
    if not tid:
        return

    keys: set[str] = {tid}
    org = Organism.objects(taxid=tid).only("taxid", "taxon_lineage").first()
    if org is not None:
        for node_id in org.taxon_lineage or []:
            if node_id is None:
                continue
            s = str(node_id).strip()
            if s:
                keys.add(s)
    if lineage_fallback is not None:
        for node_id in lineage_fallback:
            if node_id is None:
                continue
            s = str(node_id).strip()
            if s:
                keys.add(s)

    from jobs.support.stats import refresh_taxon_node_counts_for_lineage_keys

    refresh_taxon_node_counts_for_lineage_keys(sorted(keys))


def reconcile_taxon_lineage_after_organism_delete(taxon_nodes) -> None:
    """
    After the last Organism for a branch is removed: refresh TaxonNode counts and
    prune nodes with zero organisms_count.
    """
    nodes = list(taxon_nodes)
    if not nodes:
        return

    tax_ids = sorted({str(n.taxid) for n in nodes if getattr(n, "taxid", None)})
    if not tax_ids:
        return

    from jobs.support.stats import refresh_taxon_node_counts_for_lineage_keys

    refresh_taxon_node_counts_for_lineage_keys(tax_ids)

    for node in TaxonNode.objects(taxid__in=tax_ids):
        if (node.organisms_count or 0) != 0:
            continue
        TaxonNode.objects(children=node.taxid).update(pull__children=node.taxid)
        node.delete()


def refresh_organism_status_for_taxid(
    taxid: Union[str, int],
    *,
    apply_goat_inference: bool = True,
    merge_context: MergeContext = "default",
) -> None:
    """Recompute denormalized catalog counters and GoaT-related fields on the species Organism."""
    tid = str(taxid)
    organism = Organism.objects(taxid=tid).first()
    if not organism:
        return
    counts = fetch_related_counts(tid)
    refresh_organism_status_fields(
        organism,
        counts,
        goat_project_name=GOAT_PROJECT_NAME,
        apply_goat_inference=apply_goat_inference,
        merge_context=merge_context,
    )
    organism.save()


def refresh_taxon_counts_for_species(
    taxid: Union[str, int, None],
    taxon_lineage_fallback: Optional[Iterable[str]] = None,
) -> None:
    """Recompute TaxonNode aggregates for this taxid and ancestors."""
    if taxid is None:
        return
    refresh_taxon_counts_for_taxid_lineage(str(taxid), taxon_lineage_fallback)


def sync_species_after_catalog_change(
    taxid: Union[str, int, None],
    taxon_lineage_fallback: Optional[Iterable[str]] = None,
    *,
    apply_goat_inference: bool = True,
    merge_context: MergeContext = "default",
) -> None:
    """
    After a catalog row is created, updated, or deleted: refresh that species' Organism
    (denormalized counts + GoaT status when inference applies) and TaxonNode roll-ups.
    """
    if taxid is None:
        return
    tid = str(taxid)
    refresh_organism_status_for_taxid(
        tid,
        apply_goat_inference=apply_goat_inference,
        merge_context=merge_context,
    )
    refresh_taxon_counts_for_species(tid, taxon_lineage_fallback)


def delete_assembly_document_and_dependents(assembly) -> None:
    """
    Remove one assembly row and its chromosome + genome annotation dependents.

    Used by cascade deletes and bulk orphan cleanup (often with ``sync_species=False``).
    """
    accession = assembly.accession
    chromosomes = assembly.chromosomes
    assembly.delete()
    if chromosomes:
        Chromosome.objects(accession_version__in=chromosomes).delete()
    GenomeAnnotation._get_collection().delete_many({"assembly_accession": accession})


def cascade_delete_assembly(assembly, *, sync_species: bool = True) -> None:
    taxid = assembly.taxid
    taxon_lineage = getattr(assembly, "taxon_lineage", None)
    delete_assembly_document_and_dependents(assembly)
    if sync_species:
        sync_species_after_catalog_change(taxid, taxon_lineage)


def cascade_delete_biosample(biosample, *, sync_species: bool = True) -> None:
    taxid = biosample.taxid
    taxon_lineage = biosample.taxon_lineage
    accession = biosample.accession
    biosample.delete()
    for ass in list(Assembly.objects(sample_accession=accession)):
        delete_assembly_document_and_dependents(ass)
    SampleCoordinates.objects(sample_accession=accession).delete()
    ReadRun.objects(sample_accession=accession).delete()
    if sync_species:
        sync_species_after_catalog_change(taxid, taxon_lineage)


def cascade_delete_local_sample(local_sample, *, sync_species: bool = True) -> None:
    taxid = local_sample.taxid
    taxon_lineage = local_sample.taxon_lineage
    local_id = local_sample.local_id
    local_sample.delete()
    SampleCoordinates.objects(sample_accession=local_id).delete()
    if sync_species:
        sync_species_after_catalog_change(taxid, taxon_lineage)


def cascade_delete_organism(organism) -> None:
    taxid = str(organism.taxid)
    lineage = list(organism.taxon_lineage) if organism.taxon_lineage else []
    organism.delete()
    for assembly in list(Assembly.objects(taxid=taxid)):
        delete_assembly_document_and_dependents(assembly)

    GenomeAnnotation.objects(taxid=taxid).delete()
    ReadRun.objects(taxid=taxid).delete()
    LocalSample.objects(taxid=taxid).delete()
    BioSample.objects(taxid=taxid).delete()
    BioGenomeUser.objects(species=taxid).update(pull__species=taxid)
    taxons = TaxonNode.objects(taxid__in=lineage)
    reconcile_taxon_lineage_after_organism_delete(taxons)


def cascade_delete_experiment(experiment) -> None:
    """Delete the Experiment document, dependent Read rows, and refresh species aggregates."""
    taxid = experiment.taxid
    taxon_lineage = getattr(experiment, "taxon_lineage", None)
    exp_acc = experiment.experiment_accession
    experiment.delete()
    if exp_acc:
        Read.objects(experiment_accession=exp_acc).delete()
    sync_species_after_catalog_change(taxid, taxon_lineage)
