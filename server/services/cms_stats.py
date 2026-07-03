"""Uncached CMS dashboard overview stats (admin and data manager)."""

from __future__ import annotations

import logging

from db.constants import GOAT_PROJECT_NAME
from db.enums import Roles
from db.model import BioGenomeUser, BioSampleSubmission, Organism
from helpers.service_utils import get_or_404
from services.organisms import assigned_organism_taxids
from services.stats import compute_field_stats

logger = logging.getLogger(__name__)


def _organism_field_stats(query: dict | None = None) -> tuple[dict, dict]:
    if not (GOAT_PROJECT_NAME or "").strip():
        return {}, {}
    q = query or {}
    try:
        goat_status = compute_field_stats("organisms", "goat_status", q)
        target_list_status = compute_field_stats("organisms", "target_list_status", q)
        return goat_status, target_list_status
    except Exception:
        logger.exception("cms_stats field stats failed")
        return {}, {}


def get_admin_overview(username: str) -> dict:
    assigned_taxids = assigned_organism_taxids()
    total_species = Organism.objects.count()
    assigned_species = (
        Organism.objects(taxid__in=assigned_taxids).count() if assigned_taxids else 0
    )
    unassigned_species = total_species - assigned_species

    goat_status, target_list_status = _organism_field_stats()

    return {
        "assigned_species": assigned_species,
        "unassigned_species": unassigned_species,
        "my_submitted_biosamples": BioSampleSubmission.objects(user=username).count(),
        "all_submitted_biosamples": BioSampleSubmission.objects().count(),
        "pending_deletion_requests": Organism.objects(pending_deletion=True).count(),
        "goat_status": goat_status,
        "target_list_status": target_list_status,
    }


def get_data_manager_overview(username: str) -> dict:
    user = get_or_404(BioGenomeUser, f"User {username} not found", name=username)
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_val != Roles.DATA_MANAGER.value:
        raise PermissionError("Data managers only")

    species_ids = [str(s).strip() for s in (user.species or []) if str(s).strip()]
    assigned_species = (
        Organism.objects(taxid__in=species_ids).count() if species_ids else 0
    )

    if species_ids:
        goat_status, target_list_status = _organism_field_stats({"taxid__in": species_ids})
    else:
        goat_status, target_list_status = {}, {}

    return {
        "assigned_species": assigned_species,
        "submitted_biosamples": BioSampleSubmission.objects(user=username).count(),
        "goat_status": goat_status,
        "target_list_status": target_list_status,
    }
