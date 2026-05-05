from typing import Callable, Iterator, List, Set

from db.model import (
    Assembly,
    BioSample,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    TaxonNode,
)

_BATCH_TAXIDS = 1000


def _strip_taxids_to_set(taxids: List[str]) -> Set[str]:
    out: Set[str] = set()
    for raw in taxids:
        if raw is None:
            continue
        t = str(raw).strip()
        if t:
            out.add(t)
    return out


def _chunks(items: List[str], size: int) -> Iterator[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _merge_catalog_doc_taxids(
    doc: object,
    species_taxids: Set[str],
    taxon_node_taxids: Set[str],
) -> None:
    """Merge species taxid and lineage taxids from a catalog doc.

    ``taxon_lineage`` on catalog models is mirrored from the organism upstream, so
    recount targets need only these rows—no extra :class:`Organism` load.
    """
    if doc.taxid is not None:
        t = str(doc.taxid).strip()
        if t:
            species_taxids.add(t)
            taxon_node_taxids.add(t)
    for node_id in doc.taxon_lineage or []:
        if node_id is None:
            continue
        s = str(node_id).strip()
        if s:
            taxon_node_taxids.add(s)


def _set_taxon_node_counter_in_chunks(
    taxon_node_taxids: Set[str],
    field: str,
    count_for_lineage_key: Callable[[str], int],
) -> None:
    if not taxon_node_taxids:
        return
    for chunk in _chunks(sorted(taxon_node_taxids), _BATCH_TAXIDS):
        for node_tid in TaxonNode.objects(taxid__in=chunk).scalar("taxid"):
            TaxonNode.objects(taxid=node_tid).update(
                **{f"set__{field}": count_for_lineage_key(node_tid)},
            )


def _aggregate_counts_by_taxid(collection: object, taxid_batch: List[str]) -> dict:
    """Return ``{str(taxid): count}`` for documents whose ``taxid`` is in ``taxid_batch``."""
    if not taxid_batch:
        return {}
    pipeline = [
        {"$match": {"taxid": {"$in": taxid_batch}}},
        {"$group": {"_id": "$taxid", "c": {"$sum": 1}}},
    ]
    out: dict = {}
    for doc in collection.aggregate(pipeline):
        tid = doc.get("_id")
        if tid is None:
            continue
        key = str(tid).strip()
        if key:
            out[key] = doc.get("c", 0)
    return out


def update_organism_counts(taxids: List[str]) -> None:
    ids = _strip_taxids_to_set(taxids)
    if not ids:
        return

    id_list = sorted(ids)
    for batch in _chunks(id_list, _BATCH_TAXIDS):
        asm_c = _aggregate_counts_by_taxid(Assembly._get_collection(), batch)
        read_c = _aggregate_counts_by_taxid(ReadRun._get_collection(), batch)
        bio_c = _aggregate_counts_by_taxid(BioSample._get_collection(), batch)
        loc_c = _aggregate_counts_by_taxid(LocalSample._get_collection(), batch)
        ann_c = _aggregate_counts_by_taxid(GenomeAnnotation._get_collection(), batch)

        for species_tid in Organism.objects(taxid__in=batch).scalar("taxid"):
            if species_tid is None:
                continue
            sk = str(species_tid).strip()
            if not sk:
                continue
            Organism.objects(taxid=species_tid).update(
                set__assemblies_count=asm_c.get(sk, 0),
                set__reads_count=read_c.get(sk, 0),
                set__biosamples_count=bio_c.get(sk, 0),
                set__local_samples_count=loc_c.get(sk, 0),
                set__genome_annotations_count=ann_c.get(sk, 0),
            )


def refresh_taxon_node_counts_for_lineage_keys(taxids: List[str]) -> None:
    """
    Recompute :class:`~db.model.TaxonNode` roll-up counters for the given lineage keys.

    Use when the affected nodes are already known (e.g. an organism's ``taxon_lineage``
    after delete) without loading all organisms.
    """
    keys = _strip_taxids_to_set(taxids)
    if not keys:
        return
    _apply_taxon_node_catalog_counters(keys)


def _apply_taxon_node_catalog_counters(taxon_node_taxids: Set[str]) -> None:
    _set_taxon_node_counter_in_chunks(
        taxon_node_taxids,
        "organisms_count",
        lambda key: Organism.objects(taxon_lineage__in=[key]).count(),
    )
    _set_taxon_node_counter_in_chunks(
        taxon_node_taxids,
        "assemblies_count",
        lambda key: Assembly.objects(taxon_lineage__in=[key]).count(),
    )
    _set_taxon_node_counter_in_chunks(
        taxon_node_taxids,
        "reads_count",
        lambda key: ReadRun.objects(taxon_lineage__in=[key]).count(),
    )
    _set_taxon_node_counter_in_chunks(
        taxon_node_taxids,
        "biosamples_count",
        lambda key: BioSample.objects(taxon_lineage__in=[key]).count(),
    )
    _set_taxon_node_counter_in_chunks(
        taxon_node_taxids,
        "local_samples_count",
        lambda key: LocalSample.objects(taxon_lineage__in=[key]).count(),
    )
    _set_taxon_node_counter_in_chunks(
        taxon_node_taxids,
        "genome_annotations_count",
        lambda key: GenomeAnnotation.objects(taxon_lineage__in=[key]).count(),
    )


def update_taxon_node_counts(taxids: List[str]) -> None:
    """
    Refresh :class:`~db.model.TaxonNode` catalog counters for nodes touched by the given
    organisms.

    ``taxids`` are **organism** (species) taxids. Lineages are loaded in batches; every
    distinct taxid in ``Organism.taxon_lineage`` plus the organism's own ``taxid`` is
    collected, then each such node is recounted using the same queries as before.
    """
    ids = _strip_taxids_to_set(taxids)
    if not ids:
        return

    taxon_node_taxids: Set[str] = set()
    for id_batch in _chunks(sorted(ids), _BATCH_TAXIDS):
        species_scratch: Set[str] = set()
        for doc in Organism.objects(taxid__in=id_batch).only("taxid", "taxon_lineage"):
            _merge_catalog_doc_taxids(doc, species_scratch, taxon_node_taxids)

    if not taxon_node_taxids:
        return

    _apply_taxon_node_catalog_counters(taxon_node_taxids)


def compute_all_counts() -> int:
    """
    Refresh the five counter fields on every :class:`~db.model.Organism` and refresh
    :class:`~db.model.TaxonNode` roll-ups for every lineage key reachable from those
    organisms (same rules as :func:`update_organism_counts` /
    :func:`update_taxon_node_counts`).

    Returns the number of species (organism) taxids processed.
    """
    taxids = sorted(
        {
            str(t)
            for t in Organism.objects.scalar("taxid")
            if t is not None and str(t).strip()
        }
    )
    if not taxids:
        return 0
    update_organism_counts(taxids)
    update_taxon_node_counts(taxids)
    return len(taxids)
