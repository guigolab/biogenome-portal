from werkzeug.exceptions import BadRequest, NotFound


def require_keys(mapping, keys, *, what="payload"):
    """Raise BadRequest if any key is missing from ``mapping`` (key must be present)."""
    missing = [k for k in keys if k not in mapping]
    if missing:
        raise BadRequest(
            description=f"Missing required fields in {what}: {', '.join(missing)}"
        )


def get_or_404(model, not_found_message, *field_excludes, **filters):
    qs = model.objects(**filters)
    if field_excludes:
        qs = qs.exclude(*field_excludes)
    item = qs.first()
    if not item:
        raise NotFound(description=not_found_message)
    return item

