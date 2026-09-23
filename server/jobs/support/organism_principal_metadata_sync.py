"""
Project curator-linked OrganismPrincipal affiliations/programs onto Organism.metadata.

Writes reserved list keys only (never PI names, never legacy prose PI fields):

- ``metadata.pi_institutes`` — unique ``OrganismPrincipal.affiliations``
- ``metadata.pi_programs`` — unique ``OrganismPrincipal.programs``

Source of truth remains ``BioGenomeUser.species`` → ``principal_ids`` → ``OrganismPrincipal``.
Empty projection unsets the keys. Safe to re-run.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, List, Optional, Set

from pymongo import UpdateOne

from db.model import BioGenomeUser, Organism

logger = logging.getLogger(__name__)

PI_INSTITUTES_KEY = "pi_institutes"
PI_PROGRAMS_KEY = "pi_programs"
RESERVED_METADATA_KEYS = frozenset({PI_INSTITUTES_KEY, PI_PROGRAMS_KEY})


def _normalize_taxids(taxids: Optional[Iterable[str]]) -> Optional[List[str]]:
    if taxids is None:
        return None
    out: List[str] = []
    seen: Set[str] = set()
    for raw in taxids:
        tid = str(raw).strip() if raw is not None else ""
        if not tid or tid in seen:
            continue
        seen.add(tid)
        out.append(tid)
    return out


def _lists_for_principals(principals: list[dict]) -> tuple[list[str], list[str]]:
    from services.organisms import _dedupe_preserve_order

    institutes = _dedupe_preserve_order(
        aff for p in principals for aff in (p.get("affiliations") or [])
    )
    programs = _dedupe_preserve_order(
        prog for p in principals for prog in (p.get("programs") or [])
    )
    return institutes, programs


def _as_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(v) for v in value]


def _taxids_to_sync(taxids: Optional[List[str]], organism_to_users: dict[str, list[str]]) -> List[str]:
    """
    When taxids is None: assigned organisms plus any that still hold reserved metadata
    (so unassign / principal delete clears stale lists).
    """
    if taxids is not None:
        return taxids

    assigned = set(organism_to_users.keys())
    coll = Organism._get_collection()
    stale = coll.distinct(
        "taxid",
        {
            "$or": [
                {f"metadata.{PI_INSTITUTES_KEY}": {"$exists": True}},
                {f"metadata.{PI_PROGRAMS_KEY}": {"$exists": True}},
            ]
        },
    )
    for raw in stale:
        tid = str(raw).strip() if raw is not None else ""
        if tid:
            assigned.add(tid)
    return sorted(assigned)


def sync_organism_principal_metadata(taxids: Optional[Iterable[str]] = None) -> Dict[str, Any]:
    """
    Recompute ``metadata.pi_institutes`` / ``metadata.pi_programs`` for the given taxids
    (or all assigned + stale when ``taxids`` is None).
    """
    from services.organisms import (
        _build_organism_and_principal_maps,
        _principals_for_assigned_users,
        load_principals_by_slug,
    )

    normalized = _normalize_taxids(taxids)
    users = BioGenomeUser.objects.only("name", "species", "principal_ids").no_cache()
    organism_to_users, user_to_principal_slugs = _build_organism_and_principal_maps(users)
    principals_by_slug = load_principals_by_slug(
        slug for slugs in user_to_principal_slugs.values() for slug in slugs
    )

    target_taxids = _taxids_to_sync(normalized, organism_to_users)
    if not target_taxids:
        logger.info("organism_principal_metadata_sync: no taxids to sync")
        return {"scanned": 0, "updated": 0, "cleared": 0, "ops": 0}

    coll = Organism._get_collection()
    existing = {
        str(doc["taxid"]).strip(): doc
        for doc in coll.find(
            {"taxid": {"$in": target_taxids}},
            {"taxid": 1, "metadata": 1},
        )
        if doc.get("taxid") is not None
    }

    operations: list[UpdateOne] = []
    updated = 0
    cleared = 0

    for taxid in target_taxids:
        if taxid not in existing:
            continue
        assigned_users = list(organism_to_users.get(taxid, []))
        principals = _principals_for_assigned_users(
            assigned_users, user_to_principal_slugs, principals_by_slug
        )
        institutes, programs = _lists_for_principals(principals)

        meta = existing[taxid].get("metadata") or {}
        cur_institutes = _as_list(meta.get(PI_INSTITUTES_KEY))
        cur_programs = _as_list(meta.get(PI_PROGRAMS_KEY))
        has_institutes_key = PI_INSTITUTES_KEY in meta
        has_programs_key = PI_PROGRAMS_KEY in meta

        institutes_ok = (
            cur_institutes == institutes
            if institutes
            else (not has_institutes_key)
        )
        programs_ok = (
            cur_programs == programs
            if programs
            else (not has_programs_key)
        )
        if institutes_ok and programs_ok:
            continue

        update: Dict[str, Any] = {}
        set_fields: Dict[str, Any] = {}
        unset_fields: Dict[str, str] = {}
        if institutes:
            set_fields[f"metadata.{PI_INSTITUTES_KEY}"] = institutes
        else:
            unset_fields[f"metadata.{PI_INSTITUTES_KEY}"] = ""
        if programs:
            set_fields[f"metadata.{PI_PROGRAMS_KEY}"] = programs
        else:
            unset_fields[f"metadata.{PI_PROGRAMS_KEY}"] = ""
        if set_fields:
            update["$set"] = set_fields
        if unset_fields:
            update["$unset"] = unset_fields
        if not update:
            continue

        operations.append(UpdateOne({"taxid": taxid}, update))
        if institutes or programs:
            updated += 1
        else:
            cleared += 1

    if operations:
        coll.bulk_write(operations, ordered=False)

    logger.info(
        "organism_principal_metadata_sync: scanned=%d updated=%d cleared=%d ops=%d",
        len(target_taxids),
        updated,
        cleared,
        len(operations),
    )
    return {
        "scanned": len(target_taxids),
        "updated": updated,
        "cleared": cleared,
        "ops": len(operations),
    }
