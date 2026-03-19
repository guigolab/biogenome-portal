"""
MongoEngine document models and MongoEngine signal registration.

Always import ``db.models`` (or import ``db.signals`` explicitly) during application startup
so signal handlers are connected. Helpers may import ``db.documents`` alone when they only
need document classes and must avoid pulling in signal wiring.
"""

from db.documents import *  # noqa: F403
from db.documents import __all__  # noqa: F401

from db import signals as _db_signals  # noqa: F401 — side effect: register handlers
