"""
Service layer for the ``OrganismPrincipal`` catalog (PI / institute / program rows).

Linked only through ``BioGenomeUser.principal_ids``; ``Organism`` never references a
principal directly. See docs/cbp-pi-contributor-migration.md for the full design.
"""

import re
import unicodedata

from mongoengine.errors import NotUniqueError, ValidationError
from mongoengine.queryset.visitor import Q
from werkzeug.exceptions import BadRequest, Conflict

from db.model import BioGenomeUser, OrganismPrincipal
from helpers import resource_mixins as response_helper
from helpers.service_utils import get_or_404, require_keys


def _slugify(value):
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text


def _unique_slug(base_slug):
    slug = base_slug or "principal"
    candidate = slug
    suffix = 2
    while OrganismPrincipal.objects(slug=candidate).first():
        candidate = f"{slug}-{suffix}"
        suffix += 1
    return candidate


def _mongo_validation_message(exc):
    to_dict = getattr(exc, "to_dict", None)
    if callable(to_dict):
        try:
            return str(to_dict())
        except Exception:
            pass
    return str(exc) or "Validation failed"


def _coerce_string_list(value, field_name):
    if value is None:
        return []
    if not isinstance(value, list):
        raise BadRequest(description=f"'{field_name}' must be an array of strings")
    out = []
    for item in value:
        if not isinstance(item, str):
            raise BadRequest(description=f"'{field_name}' items must be strings")
        text = item.strip()
        if text:
            out.append(text)
    return out


def list_principals(offset=0, limit=20, filter=None):
    limit, offset = response_helper.get_pagination({"limit": limit, "offset": offset})
    qs = OrganismPrincipal.objects()
    if filter:
        qs = qs.filter(Q(name__icontains=filter) | Q(slug__icontains=filter))
    total = qs.count()
    # Exclude 'id' (ObjectId) so the REST layer can safely use plain json.dumps, same
    # pattern as services.users.get_users.
    items = qs.order_by("name").exclude("id").skip(offset).limit(limit)
    return {"total": total, "data": list(items.as_pymongo())}


def list_principal_options():
    items = OrganismPrincipal.objects.order_by("name").only("slug", "name")
    return [{"slug": p.slug, "name": p.name} for p in items]


def get_principal(slug):
    return get_or_404(OrganismPrincipal, f"Principal {slug} not found", slug=slug)


def create_principal(data):
    if not isinstance(data, dict):
        raise BadRequest(description="Principal payload must be a JSON object")
    require_keys(data, ["name"], what="principal")
    name = str(data.get("name") or "").strip()
    if not name:
        raise BadRequest(description="'name' is required")

    raw_slug = str(data.get("slug") or "").strip()
    if raw_slug:
        slug = _slugify(raw_slug)
        if not slug:
            raise BadRequest(description="'slug' could not be normalized to a valid value")
        if OrganismPrincipal.objects(slug=slug).first():
            raise Conflict(description=f"Principal slug '{slug}' already exists")
    else:
        base_slug = _slugify(name)
        if not base_slug:
            raise BadRequest(
                description="Could not derive a slug from 'name'; provide 'slug' explicitly"
            )
        slug = _unique_slug(base_slug)

    email = str(data["email"]).strip() if data.get("email") else None
    principal = OrganismPrincipal(
        slug=slug,
        name=name,
        affiliations=_coerce_string_list(data.get("affiliations"), "affiliations"),
        programs=_coerce_string_list(data.get("programs"), "programs"),
        email=email or None,
        metadata=data.get("metadata") if isinstance(data.get("metadata"), dict) else {},
    )
    try:
        principal.save()
    except ValidationError as e:
        raise BadRequest(description=_mongo_validation_message(e)) from e
    except NotUniqueError as e:
        # Pre-check above already covers the common case; this only fires on a
        # concurrent create racing to the same slug.
        raise Conflict(description=f"Principal slug '{slug}' already exists") from e
    return slug


def update_principal(slug, data):
    """
    Update an ``OrganismPrincipal``. ``slug`` is immutable after creation (the CMS form
    and ``BioGenomeUser.principal_ids`` references rely on a stable identifier) — any
    ``slug`` key in the payload is ignored.
    """
    principal = get_or_404(OrganismPrincipal, f"Principal {slug} not found", slug=slug)
    if not isinstance(data, dict):
        raise BadRequest(description="Principal payload must be a JSON object")

    if "name" in data:
        name = str(data.get("name") or "").strip()
        if not name:
            raise BadRequest(description="'name' cannot be empty")
        principal.name = name

    if "affiliations" in data:
        principal.affiliations = _coerce_string_list(data.get("affiliations"), "affiliations")

    if "programs" in data:
        principal.programs = _coerce_string_list(data.get("programs"), "programs")

    if "email" in data:
        email = data.get("email")
        principal.email = str(email).strip() or None if email else None

    if "metadata" in data:
        meta = data.get("metadata")
        if meta is not None and not isinstance(meta, dict):
            raise BadRequest(description="'metadata' must be an object or null")
        principal.metadata = meta or {}

    try:
        principal.save()
    except ValidationError as e:
        raise BadRequest(description=_mongo_validation_message(e)) from e
    except NotUniqueError as e:
        raise Conflict(description="Another principal already uses this slug.") from e
    return principal.slug


def delete_principal(slug):
    principal = get_or_404(OrganismPrincipal, f"Principal {slug} not found", slug=slug)
    principal.delete()
    # Clean up dangling references so CMS list projection never resolves a ghost slug.
    BioGenomeUser.objects(principal_ids=slug).update(pull__principal_ids=slug)
    return slug
