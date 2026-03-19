"""URL converter: only MODEL_MAPPER keys enabled for catalog list/query routes."""

from werkzeug.routing import BaseConverter, ValidationError

from helpers.data import CATALOG_MODEL_KEYS


class CatalogModelConverter(BaseConverter):
    """Maps a path segment to a catalog key; rejects unknown segments."""

    def to_python(self, value: str) -> str:
        if value not in CATALOG_MODEL_KEYS:
            raise ValidationError()
        return value

    def to_url(self, value: str) -> str:
        if value not in CATALOG_MODEL_KEYS:
            raise ValueError(f"Invalid catalog model: {value!r}")
        return value
