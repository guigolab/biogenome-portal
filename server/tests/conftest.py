"""
Shared pytest fixtures for the ``server`` test suite.

Tests that touch MongoEngine models use an in-memory ``mongomock`` backend (see
``mongo_test_db``) instead of a real MongoDB - no live database is required or touched.
"""

from __future__ import annotations

import mongoengine
import pytest


@pytest.fixture(autouse=True)
def mongo_test_db():
    """
    Connect MongoEngine's default alias to an isolated in-memory ``mongomock`` database for
    the duration of a test, then disconnect. Autouse so every test gets a clean database
    without needing to remember the fixture.

    Uses mongoengine's native ``is_mock=True`` connect kwarg (backs the connection with
    ``mongomock.MongoClient`` internally), which the project's pinned
    ``mongoengine==0.26.0`` already supports - no separate patching needed.
    """
    mongoengine.connect(
        db="biogenome_portal_test",
        alias="default",
        is_mock=True,
        uuidRepresentation="standard",
    )
    try:
        yield
    finally:
        mongoengine.disconnect(alias="default")
