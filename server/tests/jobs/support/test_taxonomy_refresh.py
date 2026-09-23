"""
Tests for the hardened taxonomy refresh pipeline (see
``jobs/support/taxonomy_refresh.py`` and the audit that motivated these changes).

DB-touching tests use the in-memory ``mongomock`` backend wired up in ``tests/conftest.py``
- no real MongoDB is required or touched.
"""

from __future__ import annotations

from typing import Any, Dict, List

from db.model import Organism, TaxonNode
from jobs.support import taxonomy_refresh as tr
from jobs.support.taxonomy_refresh import OrganismChange


def _org(taxid: str, name: str, lineage: List[str] | None = None) -> Organism:
    """Build an *unsaved* Organism instance (no DB round trip needed for comparisons)."""
    return Organism(taxid=taxid, scientific_name=name, taxon_lineage=lineage or [taxid])


# ---------------------------------------------------------------------------
# compute_organism_changes
# ---------------------------------------------------------------------------


def test_no_change_detected_when_everything_matches():
    db_org = _org("1", "Homo sapiens", ["1", "2", "3"])
    fresh_org = _org("1", "Homo sapiens", ["1", "2", "3"])

    changes = tr.compute_organism_changes([db_org], [fresh_org])

    assert changes == []


def test_primary_match_detects_name_only_change():
    db_org = _org("1", "Old name", ["1", "2"])
    fresh_org = _org("1", "New name", ["1", "2"])

    [change] = tr.compute_organism_changes([db_org], [fresh_org])

    assert change.change_type == "scientific_name"
    assert change.fresh_org.scientific_name == "New name"


def test_primary_match_detects_lineage_only_change():
    db_org = _org("1", "Homo sapiens", ["1", "2"])
    fresh_org = _org("1", "Homo sapiens", ["1", "2", "99"])

    [change] = tr.compute_organism_changes([db_org], [fresh_org])

    assert change.change_type == "lineage_only"


def test_fallback_by_name_detects_taxid_only_change():
    """Old taxid deprecated; ENA now serves the same name under a new taxid."""
    db_org = _org("1", "Homo sapiens", ["1", "2"])
    fresh_org = _org("2", "Homo sapiens", ["2", "3"])  # new taxid, same name

    [change] = tr.compute_organism_changes([db_org], [fresh_org])

    assert change.change_type == "taxid"
    assert change.fresh_org.taxid == "2"


def test_fallback_by_name_detects_both_taxid_and_name_change():
    """
    Regression test for the classification bug: previously the fallback-by-name branch
    could only ever report "taxid" or "lineage_only", never "both", even when the matched
    organism's name differs from the old name too (case difference here, since the
    fallback lookup itself is case-insensitive).
    """
    db_org = _org("1", "homo sapiens", ["1", "2"])
    fresh_org = _org("2", "Homo Sapiens", ["2", "3"])  # new taxid + different casing

    [change] = tr.compute_organism_changes([db_org], [fresh_org])

    assert change.change_type == "both"
    assert change.fresh_org.taxid == "2"
    assert change.fresh_org.scientific_name == "Homo Sapiens"


def test_unmatched_organism_is_skipped_not_raised(caplog):
    db_org = _org("1", "Nowhere species", ["1"])
    fresh_org = _org("2", "Unrelated species", ["2"])

    changes = tr.compute_organism_changes([db_org], [fresh_org])

    assert changes == []


# ---------------------------------------------------------------------------
# _fetch_single_taxon_fallback_for_unmatched
# ---------------------------------------------------------------------------


def test_single_taxon_fallback_only_attempts_unmatched_taxids(monkeypatch):
    calls: List[str] = []

    def fake_retrieve(taxid: str):
        calls.append(taxid)
        if taxid == "resolvable":
            return _org("resolvable", "Resolved species", ["resolvable"]), [
                TaxonNode(taxid="resolvable", name="Resolved species", rank="species")
            ]
        return None, None

    monkeypatch.setattr(tr, "retrieve_taxonomic_info", fake_retrieve)

    db_organisms = [
        _org("matched", "Already fresh", ["matched"]),
        _org("resolvable", "Old stale name", ["resolvable"]),
        _org("unresolvable", "Truly gone", ["unresolvable"]),
    ]
    fresh_organisms = [_org("matched", "Already fresh", ["matched"])]
    fresh_taxons: Dict[str, Any] = {}

    augmented_organisms, augmented_taxons, stats = tr._fetch_single_taxon_fallback_for_unmatched(
        db_organisms, fresh_organisms, fresh_taxons
    )

    # Only the two unmatched taxids are retried, never the one already in the bulk fetch.
    assert set(calls) == {"resolvable", "unresolvable"}
    assert stats == {"attempted": 2, "resolved": 1, "unresolved": 1}

    augmented_taxids = {str(o.taxid) for o in augmented_organisms}
    assert augmented_taxids == {"matched", "resolvable"}
    assert "resolvable" in augmented_taxons


def test_single_taxon_fallback_noop_when_nothing_unmatched(monkeypatch):
    def fail_if_called(taxid: str):
        raise AssertionError("should not be called when everything already matched")

    monkeypatch.setattr(tr, "retrieve_taxonomic_info", fail_if_called)

    db_organisms = [_org("1", "Homo sapiens", ["1"])]
    fresh_organisms = [_org("1", "Homo sapiens", ["1"])]

    organisms, taxons, stats = tr._fetch_single_taxon_fallback_for_unmatched(
        db_organisms, fresh_organisms, {}
    )

    assert organisms is fresh_organisms
    assert stats == {"attempted": 0, "resolved": 0, "unresolved": 0}


# ---------------------------------------------------------------------------
# _guard_changes_against_unique_collisions
# ---------------------------------------------------------------------------


def test_guard_disambiguates_name_collision_with_existing_organism():
    Organism(taxid="1", scientific_name="Alpha").save()
    Organism(taxid="2", scientific_name="Beta").save()

    # Organism 1 would be renamed to "Beta", already owned by organism 2.
    change = OrganismChange(
        db_org=_org("1", "Alpha", ["1"]),
        fresh_org=_org("1", "Beta", ["1"]),
        change_type="scientific_name",
    )

    safe_changes, stats = tr._guard_changes_against_unique_collisions([change])

    assert stats == {"taxid_collisions_skipped": 0, "name_collisions_disambiguated": 1}
    assert len(safe_changes) == 1
    assert safe_changes[0].fresh_org.scientific_name == "Beta [NCBI:1]"


def test_guard_skips_taxid_collision_with_existing_organism():
    Organism(taxid="1", scientific_name="Alpha").save()
    Organism(taxid="2", scientific_name="Beta").save()

    # Organism 1 would be remapped onto taxid "2", already owned by organism 2.
    change = OrganismChange(
        db_org=_org("1", "Alpha", ["1"]),
        fresh_org=_org("2", "Alpha", ["2"]),
        change_type="taxid",
    )

    safe_changes, stats = tr._guard_changes_against_unique_collisions([change])

    assert stats == {"taxid_collisions_skipped": 1, "name_collisions_disambiguated": 0}
    assert safe_changes == []


def test_guard_disambiguates_peer_collision_within_same_batch():
    # Neither taxid pre-exists in the DB; both changes want the same new name.
    change_a = OrganismChange(
        db_org=_org("10", "Old A", ["10"]),
        fresh_org=_org("10", "Gamma", ["10"]),
        change_type="scientific_name",
    )
    change_b = OrganismChange(
        db_org=_org("11", "Old B", ["11"]),
        fresh_org=_org("11", "Gamma", ["11"]),
        change_type="scientific_name",
    )

    safe_changes, stats = tr._guard_changes_against_unique_collisions([change_a, change_b])

    assert stats["name_collisions_disambiguated"] == 1
    names = {c.fresh_org.taxid: c.fresh_org.scientific_name for c in safe_changes}
    assert names["10"] == "Gamma"
    assert names["11"] == "Gamma [NCBI:11]"


def test_guard_allows_change_when_new_name_only_used_by_itself():
    Organism(taxid="1", scientific_name="Alpha").save()

    # Organism 1 keeps roughly the same name (e.g. only lineage changed); it "collides"
    # only with its own existing row, which is not a real collision.
    change = OrganismChange(
        db_org=_org("1", "Alpha", ["1"]),
        fresh_org=_org("1", "Alpha", ["1", "2"]),
        change_type="lineage_only",
    )

    safe_changes, stats = tr._guard_changes_against_unique_collisions([change])

    assert stats == {"taxid_collisions_skipped": 0, "name_collisions_disambiguated": 0}
    assert safe_changes[0].fresh_org.scientific_name == "Alpha"


# ---------------------------------------------------------------------------
# _rebuild_children_for_touched_nodes
# ---------------------------------------------------------------------------


def test_rebuild_children_removes_stale_edge_when_organism_reparented():
    TaxonNode(taxid="old_parent", name="Old Parent", rank="genus", children=["species_x"]).save()
    TaxonNode(taxid="new_parent", name="New Parent", rank="genus", children=[]).save()

    # Organism already reflects its NEW lineage in the DB (this runs after the Organism
    # update, per the pipeline ordering).
    Organism(
        taxid="species_x",
        scientific_name="Species X",
        taxon_lineage=["species_x", "new_parent"],
    ).save()

    tr._rebuild_children_for_touched_nodes({"old_parent", "new_parent"})

    old_parent = TaxonNode.objects(taxid="old_parent").first()
    new_parent = TaxonNode.objects(taxid="new_parent").first()
    assert old_parent.children == []
    assert new_parent.children == ["species_x"]


def test_rebuild_children_is_noop_for_empty_input():
    # Should not raise or query anything for an empty/blank set.
    tr._rebuild_children_for_touched_nodes(set())
    tr._rebuild_children_for_touched_nodes({"", None})  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# apply_organism_updates: Organism-first ordering + per-change isolation
# ---------------------------------------------------------------------------


def test_apply_organism_updates_isolates_failures_and_updates_organism_first(monkeypatch):
    Organism(taxid="1", scientific_name="Old A", taxon_lineage=["1"]).save()
    Organism(taxid="2", scientific_name="Old B", taxon_lineage=["2"]).save()

    good_change = OrganismChange(
        db_org=_org("1", "Old A", ["1"]),
        fresh_org=_org("1", "New A", ["1"]),
        change_type="scientific_name",
    )
    bad_change = OrganismChange(
        db_org=_org("2", "Old B", ["2"]),
        fresh_org=_org("2", "New B", ["2"]),
        change_type="scientific_name",
    )

    original_propagate = tr.propagate_organism_changes_to_related

    def flaky_propagate(changes):
        if changes and changes[0].db_org.taxid == "2":
            raise RuntimeError("simulated catalog propagation failure")
        return original_propagate(changes)

    monkeypatch.setattr(tr, "propagate_organism_changes_to_related", flaky_propagate)

    result = tr.apply_organism_updates([good_change, bad_change])

    assert result["applied"] == 1
    assert len(result["failed"]) == 1
    assert result["failed"][0]["old_taxid"] == "2"
    assert "simulated catalog propagation failure" in result["failed"][0]["error"]

    # The good change fully applied.
    assert Organism.objects(taxid="1").first().scientific_name == "New A"

    # The bad change's Organism update still landed (Organism-first ordering) even though
    # catalog propagation for it failed - the pipeline is idempotent/retry-safe because of
    # this, not silently inconsistent.
    assert Organism.objects(taxid="2").first().scientific_name == "New B"


# ---------------------------------------------------------------------------
# execute_taxonomy_refresh_pipeline: orchestration-level behavior
# ---------------------------------------------------------------------------


def _stub_no_fallback(monkeypatch):
    monkeypatch.setattr(tr, "retrieve_taxonomic_info", lambda taxid: (None, None))


def test_pipeline_applies_rename_and_lineage_change(monkeypatch):
    _stub_no_fallback(monkeypatch)

    Organism(taxid="1", scientific_name="Old A", taxon_lineage=["1", "2", "3"]).save()
    Organism(taxid="4", scientific_name="Stable B", taxon_lineage=["4", "5", "6"]).save()
    for tid, name, rank in [
        ("1", "Old A", "species"),
        ("2", "Genus2", "genus"),
        ("3", "Family3", "family"),
        ("4", "Stable B", "species"),
        ("5", "Genus5", "genus"),
        ("6", "Family6", "family"),
        ("7", "Family7", "family"),
    ]:
        TaxonNode(taxid=tid, name=name, rank=rank).save()

    def fake_fetch_new_organisms(batch, tmp_dir):
        organisms = [
            _org("1", "New A", ["1", "2", "3"]),  # rename only
            _org("4", "Stable B", ["4", "5", "7"]),  # ancestor 6 -> 7 (lineage change)
        ]
        taxons = {
            "1": TaxonNode(taxid="1", name="New A", rank="species"),
            "2": TaxonNode(taxid="2", name="Genus2", rank="genus"),
            "3": TaxonNode(taxid="3", name="Family3", rank="family"),
            "4": TaxonNode(taxid="4", name="Stable B", rank="species"),
            "5": TaxonNode(taxid="5", name="Genus5", rank="genus"),
            "7": TaxonNode(taxid="7", name="Family7", rank="family"),
        }
        return [o for o in organisms if str(o.taxid) in {str(t) for t in batch}], {
            k: v for k, v in taxons.items() if k in {str(t) for t in batch}
        }

    monkeypatch.setattr(tr, "fetch_new_organisms", fake_fetch_new_organisms)

    result = tr.execute_taxonomy_refresh_pipeline(tmp_dir="/tmp")

    assert result["organisms_updated"] == 2
    assert result["changes_failed"] == 0
    assert result["taxid_collisions_skipped"] == 0
    assert result["name_collisions_disambiguated"] == 0

    assert Organism.objects(taxid="1").first().scientific_name == "New A"
    assert Organism.objects(taxid="4").first().taxon_lineage == ["4", "5", "7"]

    # Old ancestor 6 lost its descendant (genus 5); new ancestor 7 gained it. "children" is
    # the *immediate* child in the lineage chain, so 7's child is genus 5, not species 4.
    assert TaxonNode.objects(taxid="6").first().children == []
    assert TaxonNode.objects(taxid="7").first().children == ["5"]


def test_pipeline_applies_taxon_node_intrinsic_fix_with_no_organism_change(monkeypatch):
    """
    Regression test for the "TaxonNode intrinsic sync gated on organism changes" bug: a
    pure ENA rank/name correction with zero organism-level changes anywhere in the DB must
    still be applied.
    """
    _stub_no_fallback(monkeypatch)

    Organism(taxid="8", scientific_name="Species8", taxon_lineage=["8", "9"]).save()
    TaxonNode(taxid="8", name="Species8", rank="species").save()
    TaxonNode(taxid="9", name="Stale Family Name", rank="order").save()  # wrong rank/name

    def fake_fetch_new_organisms(batch, tmp_dir):
        organisms = [_org("8", "Species8", ["8", "9"])]  # identical to DB: no change
        taxons = {
            "8": TaxonNode(taxid="8", name="Species8", rank="species"),
            "9": TaxonNode(taxid="9", name="Corrected Family Name", rank="family"),
        }
        return [o for o in organisms if str(o.taxid) in {str(t) for t in batch}], {
            k: v for k, v in taxons.items() if k in {str(t) for t in batch}
        }

    monkeypatch.setattr(tr, "fetch_new_organisms", fake_fetch_new_organisms)

    result = tr.execute_taxonomy_refresh_pipeline(tmp_dir="/tmp")

    assert result["organisms_updated"] == 0
    assert result["taxon_nodes_fields_updated"] == 1

    node = TaxonNode.objects(taxid="9").first()
    assert node.name == "Corrected Family Name"
    assert node.rank == "family"


def test_pipeline_returns_zero_result_when_no_organisms():
    result = tr.execute_taxonomy_refresh_pipeline(tmp_dir="/tmp")

    assert result["organisms_updated"] == 0
    assert result["species_fetched"] == 0


def test_pipeline_does_not_drop_successful_change_when_sibling_change_shares_new_taxid(
    monkeypatch,
):
    """
    Regression test: two *different* old species can legitimately be remapped onto the
    same new taxid in one run (e.g. an upstream taxon merge/synonymization). Neither new
    taxid pre-exists in the DB, so ``_guard_changes_against_unique_collisions`` cannot
    foresee the clash - it is only discovered when ``apply_organism_updates`` applies the
    second one and hits the real unique-index violation. The first (successful) change
    must still be counted/recounted; filtering "applied" changes by new-taxid *value*
    would incorrectly drop it too, since it shares that value with the failed one.
    """
    _stub_no_fallback(monkeypatch)

    Organism(taxid="1", scientific_name="Species A", taxon_lineage=["1"]).save()
    Organism(taxid="2", scientific_name="Species B", taxon_lineage=["2"]).save()

    # Both old taxids are absent from the bulk response under their own key (each now
    # reports the merged taxid "99"), so compute_organism_changes matches each via its
    # scientific_name fallback - both changes end up targeting the same new taxid "99",
    # which neither pre-check can foresee since "99" doesn't exist in the DB yet.
    def fake_fetch(batch, tmp_dir):
        rows = {
            "1": _org("99", "Species A", ["99"]),
            "2": _org("99", "Species B", ["99"]),
        }
        wanted = {str(t) for t in batch}
        return [org for old_tid, org in rows.items() if old_tid in wanted], {}

    monkeypatch.setattr(tr, "fetch_new_organisms", fake_fetch)

    result = tr.execute_taxonomy_refresh_pipeline(tmp_dir="/tmp")

    assert result["changes_failed"] == 1
    assert result["organisms_updated"] == 1

    # Exactly one of the two organisms now has taxid 99; the other kept its old taxid
    # rather than being silently lost from counting/recounting.
    assert Organism.objects(taxid="99").count() == 1
    assert Organism.objects(taxid__in=["1", "2"]).count() == 1

    # The surviving change must still have been recounted (i.e. included in
    # `updated_taxids` downstream), not silently dropped because it shares its *new*
    # taxid value with the failed sibling change.
    winner = Organism.objects(taxid="99").first()
    assert winner.assemblies_count == 0
