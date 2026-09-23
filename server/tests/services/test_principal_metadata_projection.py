"""
Curator / PI assignment must project institutes and programs onto Organism.metadata
for public species-list facets (pi_institutes / pi_programs).
"""

from __future__ import annotations

import sys
from unittest.mock import MagicMock, patch

# Service modules import Flask (JWT / Response helpers). Keep tests runnable without a
# pinned Flask/Werkzeug pair matching the app (user site packages may conflict).
for _mod in ("flask", "flask_jwt_extended"):
    sys.modules.setdefault(_mod, MagicMock())

from db.enums import Roles
from db.model import BioGenomeUser, Organism, OrganismPrincipal
from jobs.support.organism_principal_metadata_sync import (
    PI_INSTITUTES_KEY,
    PI_PROGRAMS_KEY,
)
from services import organism_principals, users


def _organism(taxid: str = "9606", name: str = "Homo sapiens") -> Organism:
    return Organism(taxid=taxid, scientific_name=name).save()


def _principal(
    slug: str = "jane-doe",
    name: str = "Jane Doe",
    affiliations: list | None = None,
    programs: list | None = None,
) -> OrganismPrincipal:
    return OrganismPrincipal(
        slug=slug,
        name=name,
        affiliations=affiliations or ["Institute A"],
        programs=programs or ["Program X"],
    ).save()


def _curator(
    name: str = "curator1",
    species: list | None = None,
    principal_ids: list | None = None,
) -> BioGenomeUser:
    return BioGenomeUser(
        name=name,
        password="secret",
        role=Roles.DATA_MANAGER,
        species=species or [],
        principal_ids=principal_ids or [],
    ).save()


def _meta(taxid: str) -> dict:
    org = Organism.objects.get(taxid=taxid)
    return dict(org.metadata or {})


def test_update_user_principal_ids_projects_metadata():
    _organism("9606")
    _principal(affiliations=["Inst A"], programs=["Prog X"])
    _curator(species=["9606"], principal_ids=[])

    with patch.object(users, "_forbid_root"), patch.object(
        users, "_assert_admin_may_modify_user"
    ):
        users.update_user("curator1", {"principal_ids": ["jane-doe"]})

    meta = _meta("9606")
    assert meta.get(PI_INSTITUTES_KEY) == ["Inst A"]
    assert meta.get(PI_PROGRAMS_KEY) == ["Prog X"]


def test_update_user_species_assignment_projects_metadata():
    _organism("9606")
    _principal(affiliations=["Inst B"], programs=["Prog Y"])
    _curator(species=[], principal_ids=["jane-doe"])

    with patch.object(users, "_forbid_root"), patch.object(
        users, "_assert_admin_may_modify_user"
    ):
        users.update_user("curator1", {"species": ["9606"]})

    meta = _meta("9606")
    assert meta.get(PI_INSTITUTES_KEY) == ["Inst B"]
    assert meta.get(PI_PROGRAMS_KEY) == ["Prog Y"]


def test_update_user_clear_principal_unsets_metadata():
    _organism("9606")
    _principal()
    _curator(species=["9606"], principal_ids=["jane-doe"])
    # Seed projected keys as if a prior sync ran.
    Organism.objects(taxid="9606").update(
        set__metadata={
            PI_INSTITUTES_KEY: ["Inst A"],
            PI_PROGRAMS_KEY: ["Prog X"],
        }
    )

    with patch.object(users, "_forbid_root"), patch.object(
        users, "_assert_admin_may_modify_user"
    ):
        users.update_user("curator1", {"principal_ids": []})

    meta = _meta("9606")
    assert PI_INSTITUTES_KEY not in meta
    assert PI_PROGRAMS_KEY not in meta


def test_create_user_with_species_and_principals_projects_metadata():
    _organism("9606")
    _principal(affiliations=["Inst C"], programs=["Prog Z"])

    users.create_user(
        {
            "name": "new-curator",
            "password": "secret",
            "role": "DataManager",
            "species": ["9606"],
            "principal_ids": ["jane-doe"],
        }
    )

    meta = _meta("9606")
    assert meta.get(PI_INSTITUTES_KEY) == ["Inst C"]
    assert meta.get(PI_PROGRAMS_KEY) == ["Prog Z"]


def test_update_principal_affiliations_reprojects_metadata():
    _organism("9606")
    _principal(affiliations=["Old Inst"], programs=["Prog X"])
    _curator(species=["9606"], principal_ids=["jane-doe"])
    Organism.objects(taxid="9606").update(
        set__metadata={
            PI_INSTITUTES_KEY: ["Old Inst"],
            PI_PROGRAMS_KEY: ["Prog X"],
        }
    )

    organism_principals.update_principal(
        "jane-doe", {"affiliations": ["New Inst"], "programs": ["Prog X"]}
    )

    meta = _meta("9606")
    assert meta.get(PI_INSTITUTES_KEY) == ["New Inst"]
    assert meta.get(PI_PROGRAMS_KEY) == ["Prog X"]


def test_delete_principal_clears_metadata():
    _organism("9606")
    _principal()
    _curator(species=["9606"], principal_ids=["jane-doe"])
    Organism.objects(taxid="9606").update(
        set__metadata={
            PI_INSTITUTES_KEY: ["Inst A"],
            PI_PROGRAMS_KEY: ["Prog X"],
        }
    )

    organism_principals.delete_principal("jane-doe")

    meta = _meta("9606")
    assert PI_INSTITUTES_KEY not in meta
    assert PI_PROGRAMS_KEY not in meta
    user = BioGenomeUser.objects.get(name="curator1")
    assert "jane-doe" not in (user.principal_ids or [])
