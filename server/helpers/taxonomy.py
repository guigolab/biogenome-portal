from db.model import TaxonNode
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set

_ENSURE_TAXON_INSERT_CHUNK = 1000


def ensure_taxon_nodes_for_organisms_lineages(organisms: Sequence[Any]) -> int:
    """
    Insert minimal ``TaxonNode`` rows for every taxid appearing in ``taxon_lineage`` that
    is not yet in the database.

    Without this, :func:`bulk_copy_organism_lineages_to_catalog` in
    ``jobs.support.catalog_denorm_finalize`` drops missing taxids from
    the ordered lineage chain, so ``parent`` / ``children`` edges are never written (e.g.
    genus never lists species as a child).

    Uses the organism's ``scientific_name`` for the organism taxid (first lineage element
    when it matches ``taxid``); other taxids use the taxid string as a temporary name until
    a taxonomy refresh fills real names/ranks.
    """
    if not organisms:
        return 0

    want_name: Dict[str, str] = {}
    all_ids: Set[str] = set()
    for o in organisms:
        otid = str(o.taxid).strip() if getattr(o, "taxid", None) else ""
        for raw in getattr(o, "taxon_lineage", None) or []:
            if raw is None:
                continue
            tid = str(raw).strip()
            if not tid:
                continue
            all_ids.add(tid)
            if otid and tid == otid:
                nm = (getattr(o, "scientific_name", None) or tid).strip() or tid
                want_name[tid] = nm
            elif tid not in want_name:
                want_name[tid] = tid

    if not all_ids:
        return 0

    id_list = sorted(all_ids)
    existing: Set[str] = set()
    for i in range(0, len(id_list), 2000):
        chunk = id_list[i : i + 2000]
        expanded = _taxid_match_values(chunk)
        for x in TaxonNode.objects(taxid__in=expanded).scalar("taxid"):
            if x is not None:
                existing.add(str(x).strip())

    missing = [t for t in id_list if t not in existing]
    if not missing:
        return 0

    inserted = 0
    for j in range(0, len(missing), _ENSURE_TAXON_INSERT_CHUNK):
        part = missing[j : j + _ENSURE_TAXON_INSERT_CHUNK]
        docs = [
            TaxonNode(
                taxid=t,
                name=want_name.get(t, t),
                rank="other",
            )
            for t in part
        ]
        TaxonNode.objects.insert(docs)
        inserted += len(docs)
    return inserted


def taxon_node_map_for_taxids(tax_ids: Iterable[str]) -> Dict[str, TaxonNode]:
    """
    Load ``TaxonNode`` documents keyed by ``str(taxid)``. Catalog taxids are stored as strings.
    """
    ids = sorted({str(t).strip() for t in tax_ids if t is not None and str(t).strip()})
    out: Dict[str, Any] = {}
    for i in range(0, len(ids), 2000):
        chunk = ids[i : i + 2000]
        expanded = _taxid_match_values(chunk)
        for n in TaxonNode.objects(taxid__in=expanded):
            if n.taxid is not None:
                out[str(n.taxid).strip()] = n
    return out


def _taxid_match_values(chunk: List[str]) -> List[str]:
    """
    Distinct stripped taxid strings for MongoDB ``$in``. Catalog models use ``StringField``
    for ``taxid`` / lineage entries (see ``db.model``).
    """
    out: List[str] = []
    seen: Set[str] = set()
    for v in chunk:
        s = str(v).strip() if v is not None else ""
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


