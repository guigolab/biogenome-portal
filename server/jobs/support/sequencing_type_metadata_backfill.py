"""
One-off backfill: migrate the legacy top-level ``Organism.sequencing_type`` field into
``Organism.metadata['sequencing_type']``.

``sequencing_type`` used to be a dedicated ``ListField(StringField)`` on ``Organism``. It has
since been retired in favor of a config-driven ``cms.organisms.fields`` custom metadata field
(same storage convention as ``metadata.PIs`` / ``metadata.institute`` / ``metadata.project``).

Uses the raw PyMongo collection (bypassing the MongoEngine ODM) so this works regardless of
whether ``sequencing_type`` is still declared on the ``Organism`` model class, and is safe to
re-run: documents without a top-level ``sequencing_type`` key are left untouched.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from pymongo import UpdateOne

from db.model import Organism

logger = logging.getLogger(__name__)


def run_sequencing_type_metadata_backfill() -> Dict[str, Any]:
    """
    For every organism with a legacy top-level ``sequencing_type`` field: move a non-empty
    value into ``metadata.sequencing_type`` (unless already set there), then unset the legacy
    field either way.
    """
    collection = Organism._get_collection()
    cursor = collection.find(
        {"sequencing_type": {"$exists": True}},
        {"_id": 1, "sequencing_type": 1, "metadata": 1},
    )

    scanned = 0
    migrated = 0
    operations: list[UpdateOne] = []

    for doc in cursor:
        scanned += 1
        legacy_value = doc.get("sequencing_type")
        metadata = doc.get("metadata") or {}

        update: Dict[str, Any] = {"$unset": {"sequencing_type": ""}}
        if legacy_value and "sequencing_type" not in metadata:
            update["$set"] = {"metadata.sequencing_type": legacy_value}
            migrated += 1

        operations.append(UpdateOne({"_id": doc["_id"]}, update))

    if operations:
        collection.bulk_write(operations, ordered=False)

    logger.info(
        "sequencing_type_metadata_backfill: scanned=%d migrated=%d",
        scanned,
        migrated,
    )
    return {"scanned": scanned, "migrated": migrated}
