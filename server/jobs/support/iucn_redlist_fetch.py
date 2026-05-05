"""
Fetch IUCN Red List assessment data for portal organisms.

Uses **Red List API v4** at ``https://api.iucnredlist.org/api/v4/`` with the
``Authorization`` header (same token as from https://api.iucnredlist.org/).
Legacy v3 ``apiv3.iucnredlist.org`` is not used: it is often blocked for
server-side clients by Cloudflare ("Just a moment..." HTML / HTTP 403).

Token: ``IUCN_TOKEN`` or ``UICN_TOKEN``. Non-commercial / conservation use only.

Conservative pacing (overridable via env):

- ``IUCN_HTTP_THROTTLE`` — base seconds between requests (default 1.25).
- ``IUCN_HTTP_THROTTLE_JITTER_SEC`` — extra random 0..N seconds per request (default 0.55).
- ``IUCN_INTER_ORGANISM_PAUSE_SEC`` — pause after each species sync (default 1.1).
- ``IUCN_INTER_ORGANISM_PAUSE_JITTER_SEC`` — extra random 0..N after each species (default 0.4).
- ``IUCN_429_MAX_WAIT_SEC`` — cap on seconds to honor ``Retry-After`` when retrying after HTTP 429 (default 120).
- ``IUCN_DOCUMENTATION_MAX_CHARS`` — max chars stored from assessment ``documentation`` (default 24000).
- ``IUCN_RANK_PAGE_DELAY_SEC`` — fixed extra sleep before each ``taxa/{rank}/{name}`` page call on top of
  the standard throttle (default 2.0 s). Controls pacing of the bulk rank-based fetch path.
"""

from __future__ import annotations

import email.utils
import json
import logging
import os
import random
import re
import time
import urllib.parse
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests

from db.embedded_docs import OrganismRedList
from db.model import Organism

logger = logging.getLogger(__name__)

_IUCN_V4_BASE = os.getenv(
    "IUCN_API_V4_BASE", "https://api.iucnredlist.org/api/v4/"
).rstrip("/") + "/"
_REQUEST_TIMEOUT = (5, 45)
# Defaults are deliberately slower than IUCN's ">=0.5s between calls" guidance.
_BASE_THROTTLE = float(os.getenv("IUCN_HTTP_THROTTLE", "1.25"))
_THROTTLE_JITTER = float(os.getenv("IUCN_HTTP_THROTTLE_JITTER_SEC", "0.55"))
_INTER_ORG_PAUSE = float(os.getenv("IUCN_INTER_ORGANISM_PAUSE_SEC", "1.1"))
_INTER_ORG_JITTER = float(os.getenv("IUCN_INTER_ORGANISM_PAUSE_JITTER_SEC", "0.4"))
_USER_AGENT = os.getenv(
    "IUCN_HTTP_USER_AGENT",
    "BioGenomePortal/1.0 (IUCN Red List v4 sync; +https://github.com/)",
)
_429_RETRY_MAX_WAIT = float(os.getenv("IUCN_429_MAX_WAIT_SEC", "120"))
_DOC_MAX = max(0, int(os.getenv("IUCN_DOCUMENTATION_MAX_CHARS", "24000")))
_RANK_PAGE_DELAY = float(os.getenv("IUCN_RANK_PAGE_DELAY_SEC", "2.0"))

# Ranks checked in priority order when grouping organisms for the bulk fetch path.
# Each tuple is (iucn_url_rank, lineage_rank_labels_attr).
# "class" is a Python keyword so the DB field is "class_name" but the URL segment is "class".
_RANK_PRIORITY: List[Tuple[str, str]] = [
    ("family", "family"),
    ("order", "order"),
    ("class", "class_name"),
    ("phylum", "phylum"),
]


def _api_token() -> Optional[str]:
    t = (os.getenv("IUCN_TOKEN") or os.getenv("UICN_TOKEN") or "").strip()
    return t or None


def _throttle() -> None:
    """Sleep between API calls: base delay plus random jitter (spreads load)."""
    base = max(0.0, _BASE_THROTTLE)
    jitter = max(0.0, _THROTTLE_JITTER)
    delay = base + (random.uniform(0.0, jitter) if jitter else 0.0)
    if delay > 0:
        time.sleep(delay)


def _inter_organism_pause() -> None:
    """Extra pause after finishing one organism (several HTTP calls)."""
    base = max(0.0, _INTER_ORG_PAUSE)
    jitter = max(0.0, _INTER_ORG_JITTER)
    delay = base + (random.uniform(0.0, jitter) if jitter else 0.0)
    if delay > 0:
        time.sleep(delay)


def _retry_after_seconds(response: requests.Response) -> Optional[float]:
    raw = response.headers.get("Retry-After")
    if not raw:
        return None
    raw = raw.strip()
    if raw.isdigit():
        return float(raw)
    try:
        dt = email.utils.parsedate_to_datetime(raw)
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0.0, (dt - datetime.now(timezone.utc)).total_seconds())
    except (TypeError, ValueError, OSError):
        return None


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": _USER_AGENT, "Accept": "application/json"})
    return s


def normalize_binomial(scientific_name: str) -> str:
    """Strip authority in parentheses and collapse whitespace."""
    s = " ".join((scientific_name or "").strip().split())
    s = re.sub(r"\s*\([^)]*\)\s*$", "", s)
    return " ".join(s.split())


def iucn_name_candidates(scientific_name: str) -> List[str]:
    """
    Names to try against the API (full normalized name, then genus + species if longer).
    """
    base = normalize_binomial(scientific_name)
    if not base:
        return []
    parts = base.split()
    out = [base]
    if len(parts) > 2:
        binomial = " ".join(parts[:2])
        if binomial not in out:
            out.append(binomial)
    return out


def _genus_epithet(candidate: str) -> Optional[Tuple[str, str]]:
    """First two words = genus + specific epithet (required by v4 scientific_name endpoint)."""
    parts = candidate.split()
    if len(parts) < 2:
        return None
    return parts[0], parts[1]


def _looks_like_cloudflare_challenge(r: requests.Response) -> bool:
    blob = (r.text or "")[:1200]
    return "Just a moment" in blob or "cf-chl" in blob or "cdn-cgi/challenge" in blob


def _log_bad_response(path: str, r: requests.Response) -> None:
    if _looks_like_cloudflare_challenge(r):
        logger.warning(
            "IUCN HTTP %s for %s: Cloudflare browser challenge (use API v4 host; apiv3 blocks bots). "
            "Body starts with: %s",
            r.status_code,
            path,
            (r.text or "")[:120].replace("\n", " "),
        )
        return
    try:
        err = r.json()
        if isinstance(err, dict) and "error" in err:
            logger.warning("IUCN HTTP %s for %s: %s", r.status_code, path, err)
            return
    except ValueError:
        pass
    logger.warning(
        "IUCN HTTP %s for %s: %s",
        r.status_code,
        path,
        (r.text or "")[:500],
    )


def _get_v4(
    session: requests.Session,
    token: str,
    path: str,
    *,
    params: Optional[Dict[str, Any]] = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[int]]:
    """
    GET JSON from IUCN v4. Auth: ``Authorization: <token>`` (same as official R client).
    Returns (payload dict or None, http status).
    """
    path = path.lstrip("/")
    url = f"{_IUCN_V4_BASE}{path}"
    headers = {"Authorization": token}
    req_params = dict(params) if params else None

    _throttle()
    try:
        r = session.get(
            url,
            params=req_params,
            headers=headers,
            timeout=_REQUEST_TIMEOUT,
        )
    except requests.RequestException as e:
        logger.warning("IUCN request failed %s: %s", path, e)
        return None, None

    if r.status_code == 429:
        wait = _retry_after_seconds(r)
        if wait is None:
            wait = 75.0
        wait = min(max(wait, 5.0), _429_RETRY_MAX_WAIT)
        logger.warning(
            "IUCN rate limited (429) for %s; waiting %.1fs then retrying once",
            path,
            wait,
        )
        time.sleep(wait)
        try:
            _throttle()
            r = session.get(
                url,
                params=req_params,
                headers=headers,
                timeout=_REQUEST_TIMEOUT,
            )
        except requests.RequestException as e:
            logger.warning("IUCN retry failed %s: %s", path, e)
            return None, None

    if r.status_code == 404:
        return None, 404

    if not r.ok:
        _log_bad_response(path, r)
        return None, r.status_code

    try:
        data = r.json()
    except ValueError:
        logger.warning("IUCN invalid JSON for %s", path)
        return None, r.status_code

    if not isinstance(data, dict):
        logger.warning("IUCN unexpected JSON type for %s", path)
        return None, r.status_code

    return data, r.status_code


def _pick_assessment_id(assessments: Any) -> Optional[int]:
    """Prefer an assessment scoped as global, else the first assessment_id."""
    if not isinstance(assessments, list) or not assessments:
        return None

    def _aid(item: Dict[str, Any]) -> Optional[int]:
        raw = item.get("assessment_id", item.get("assessmentId"))
        if raw is None:
            return None
        try:
            return int(raw)
        except (TypeError, ValueError):
            return None

    for item in assessments:
        if not isinstance(item, dict):
            continue
        scopes = item.get("scopes") or []
        if isinstance(scopes, list):
            for sc in scopes:
                if isinstance(sc, dict):
                    code = str(sc.get("code") or "").strip().lower()
                    if code == "global":
                        got = _aid(item)
                        if got is not None:
                            return got

    first = assessments[0]
    if isinstance(first, dict):
        return _aid(first)
    return None


def _scalar_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        return s or None
    if isinstance(value, (int, float)):
        return str(int(value)) if float(value).is_integer() else str(value)
    if isinstance(value, dict):
        for key in ("en", "value", "code", "label", "description"):
            inner = value.get(key)
            if isinstance(inner, str) and inner.strip():
                return inner.strip()
            if isinstance(inner, dict):
                en = inner.get("en")
                if isinstance(en, str) and en.strip():
                    return en.strip()
        return None
    s = str(value).strip()
    return s or None


def _red_list_category_code(raw: Any) -> Optional[str]:
    if raw is None:
        return None
    if isinstance(raw, dict):
        c = raw.get("code")
        if c is not None:
            return _scalar_str(c)
        return _scalar_str(raw)
    return _scalar_str(raw)


def _as_dict_list(value: Any) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [x for x in value if isinstance(x, dict)]


def _json_safe(value: Any, max_depth: int = 14) -> Any:
    """Recursively coerce assessment fragments to BSON/JSON-friendly values."""
    if max_depth < 0:
        return None
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    try:
        from bson import ObjectId  # type: ignore

        if isinstance(value, ObjectId):
            return str(value)
    except ImportError:
        pass
    if isinstance(value, dict):
        return {str(k): _json_safe(v, max_depth - 1) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v, max_depth - 1) for v in value]
    return str(value)


def _fingerprint_habitat_or_threat(d: Dict[str, Any]) -> str:
    code = str(d.get("code") or "").strip()
    season = str(d.get("season") or "").strip()
    timing = str(d.get("timing") or "").strip()
    desc = d.get("description")
    blob = ""
    if isinstance(desc, str):
        blob = desc.strip()[:500]
    elif isinstance(desc, dict):
        en = desc.get("en")
        if isinstance(en, str):
            blob = en.strip()[:500]
    ias = str(d.get("ias") or "").strip()
    return f"{code}|{season}|{timing}|{ias}|{blob}"


def _extend_unique_dicts(target: List[Dict[str, Any]], items: List[Dict[str, Any]]) -> None:
    seen = {_fingerprint_habitat_or_threat(x) for x in target}
    for d in items:
        fp = _fingerprint_habitat_or_threat(d)
        if fp in seen and fp != "|":
            continue
        seen.add(fp)
        target.append(d)


def _gather_habitat_dicts(assessment: Dict[str, Any]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    _extend_unique_dicts(out, _as_dict_list(assessment.get("habitats")))
    _extend_unique_dicts(out, _as_dict_list(assessment.get("habitat")))
    eco = assessment.get("ecology")
    if isinstance(eco, dict):
        _extend_unique_dicts(out, _as_dict_list(eco.get("habitats")))
        _extend_unique_dicts(out, _as_dict_list(eco.get("habitat")))
    inner = assessment.get("assessment")
    if isinstance(inner, dict):
        _extend_unique_dicts(out, _as_dict_list(inner.get("habitats")))
        _extend_unique_dicts(out, _as_dict_list(inner.get("habitat")))
    return out


def _gather_threat_dicts(assessment: Dict[str, Any]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    _extend_unique_dicts(out, _as_dict_list(assessment.get("threats")))
    _extend_unique_dicts(out, _as_dict_list(assessment.get("threat")))
    inner = assessment.get("assessment")
    if isinstance(inner, dict):
        _extend_unique_dicts(out, _as_dict_list(inner.get("threats")))
        _extend_unique_dicts(out, _as_dict_list(inner.get("threat")))
    cons = assessment.get("conservation_actions_needed")
    if isinstance(cons, dict):
        _extend_unique_dicts(out, _as_dict_list(cons.get("threats")))
    return out


def _synthetic_row_from_prose(text: str, *, kind: str) -> Dict[str, Any]:
    t = (text or "").strip()
    if not t:
        return {}
    cap = 16000
    if len(t) > cap:
        t = t[:cap]
    return {
        "description": {"en": t},
        "source": "documentation_prose",
        "kind": kind,
    }


def _documentation_dict(assessment: Dict[str, Any]) -> Dict[str, Any]:
    doc = assessment.get("documentation")
    return doc if isinstance(doc, dict) else {}


def _merge_structured_from_documentation(
    assessment: Dict[str, Any],
    habitats: List[Dict[str, Any]],
    threats: List[Dict[str, Any]],
) -> None:
    """
    When the v4 assessment omits top-level ``habitats`` / ``threats`` but embeds structured
    lists or long-form strings under ``documentation``, copy them into the list fields.
    """
    doc = _documentation_dict(assessment)
    if not doc:
        return

    if not habitats:
        for key in ("habitats", "habitat"):
            raw = doc.get(key)
            if isinstance(raw, list) and raw:
                _extend_unique_dicts(habitats, _as_dict_list(raw))
            elif isinstance(raw, str) and raw.strip():
                syn = _synthetic_row_from_prose(raw, kind="habitats")
                if syn.get("description"):
                    habitats.append(syn)
                break

    if not threats:
        for key in ("threats", "threat"):
            raw = doc.get(key)
            if isinstance(raw, list) and raw:
                _extend_unique_dicts(threats, _as_dict_list(raw))
            elif isinstance(raw, str) and raw.strip():
                syn = _synthetic_row_from_prose(raw, kind="threats")
                if syn.get("description"):
                    threats.append(syn)
                break


def _narratives_from_assessment(assessment: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    doc = assessment.get("documentation")
    if isinstance(doc, str) and doc.strip():
        if _DOC_MAX > 0:
            out["documentation"] = doc.strip()[:_DOC_MAX]
        else:
            out["documentation"] = doc.strip()
    elif isinstance(doc, dict):
        for key, val in doc.items():
            sk = str(key)
            if isinstance(val, str) and val.strip():
                cap = min(8000, _DOC_MAX) if _DOC_MAX > 0 else 8000
                out[sk] = val.strip()[:cap] if cap else val.strip()
            elif isinstance(val, (int, float, bool)):
                out[sk] = val
            elif isinstance(val, list):
                try:
                    raw = json.dumps(val, default=str)[:4000]
                    if raw:
                        out[sk] = raw
                except (TypeError, ValueError):
                    pass

    sup = assessment.get("supplementary_info")
    if isinstance(sup, dict):
        for key, val in sup.items():
            sk = f"supplementary_{key}"
            if isinstance(val, str) and val.strip():
                out[sk] = val.strip()[:8000]
            elif isinstance(val, (int, float, bool)):
                out[sk] = val
            elif isinstance(val, list):
                try:
                    raw = json.dumps(val, default=str)[:4000]
                    if raw:
                        out[sk] = raw
                except (TypeError, ValueError):
                    pass

    return {k: _json_safe(v) for k, v in out.items()}


def fetch_iucn_assessment_for_name(
    session: requests.Session, token: str, scientific_name: str
) -> Optional[Dict[str, Any]]:
    """
    Resolve scientific name via ``taxa/scientific_name``, then load ``assessment/{id}``.
    Returns the full assessment object, or None if not listed.
    """
    for candidate in iucn_name_candidates(scientific_name):
        pair = _genus_epithet(candidate)
        if not pair:
            continue
        genus, species = pair
        taxa, st = _get_v4(
            session,
            token,
            "taxa/scientific_name",
            params={"genus_name": genus, "species_name": species},
        )
        if taxa is None:
            continue
        assessments = taxa.get("assessments")
        aid = _pick_assessment_id(assessments)
        if aid is None:
            continue

        full, st2 = _get_v4(session, token, f"assessment/{aid}")
        if full is None:
            continue
        return full

    return None


def _assessment_to_embedded(
    assessment: Optional[Dict[str, Any]],
    *,
    not_found: bool,
    assessment_id: Optional[int] = None,
) -> OrganismRedList:
    now = datetime.now(timezone.utc)
    if not_found or not assessment:
        return OrganismRedList(
            not_found=True,
            fetched_at=now,
            habitats=[],
            threats=[],
            narratives={},
            source_api_version="v4",
        )

    habitats = _gather_habitat_dicts(assessment)
    threats = _gather_threat_dicts(assessment)
    _merge_structured_from_documentation(assessment, habitats, threats)

    habitats_safe = [
        x for x in (_json_safe(h) for h in habitats) if isinstance(x, dict) and x
    ]
    threats_safe = [
        x for x in (_json_safe(h) for h in threats) if isinstance(x, dict) and x
    ]
    narratives = _narratives_from_assessment(assessment)

    if assessment_id is None:
        raw_aid = assessment.get("assessment_id")
        if raw_aid is not None:
            try:
                assessment_id = int(raw_aid)
            except (TypeError, ValueError):
                pass

    return OrganismRedList(
        not_found=False,
        assessment_id=assessment_id,
        category=_red_list_category_code(assessment.get("red_list_category")),
        population_trend=_scalar_str(assessment.get("population_trend")),
        assessment_date=_scalar_str(assessment.get("assessment_date")),
        published_year=_scalar_str(assessment.get("year_published")),
        habitats=habitats_safe,
        threats=threats_safe,
        narratives=narratives,
        fetched_at=now,
        source_api_version="v4",
    )


def sync_organism_iucn(organism: Organism, session: requests.Session, token: str) -> str:
    """
    Fetch IUCN data for one organism and save. Returns 'ok', 'not_found', or 'error'.
    """
    name = organism.scientific_name or ""
    assessment = fetch_iucn_assessment_for_name(session, token, name)
    if not assessment:
        organism.iucn_redlist = _assessment_to_embedded(None, not_found=True)
        organism.save()
        return "not_found"

    organism.iucn_redlist = _assessment_to_embedded(assessment, not_found=False)
    organism.save()
    return "ok"


def run_iucn_fetch_for_taxids(
    taxids: List[str],
    *,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Update IUCN Red List embedded docs for the given NCBI taxids.

    If ``force`` is False, skips organisms that already have ``iucn_redlist`` set.
    """
    token = _api_token()
    if not token:
        logger.error("IUCN fetch skipped: set IUCN_TOKEN or UICN_TOKEN in the environment")
        return {
            "status": "skipped",
            "reason": "missing_token",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    ids = [str(t).strip() for t in taxids if str(t).strip()]
    if not ids:
        return {
            "status": "skipped",
            "reason": "no_taxids",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    session = _session()
    ok = not_found = errors = 0
    for taxid in ids:
        org = Organism.objects(taxid=taxid).first()
        if not org:
            errors += 1
            continue
        if org.iucn_redlist is not None and not force:
            continue
        try:
            outcome = sync_organism_iucn(org, session, token)
            if outcome == "ok":
                ok += 1
            elif outcome == "not_found":
                not_found += 1
            else:
                errors += 1
        except Exception:
            logger.exception("IUCN sync failed for taxid %s", taxid)
            errors += 1
        _inter_organism_pause()

    processed = ok + not_found + errors
    return {
        "status": "ok",
        "processed": processed,
        "ok": ok,
        "not_found": not_found,
        "errors": errors,
        "force": force,
    }


def run_iucn_backfill_missing() -> Dict[str, Any]:
    """
    Refresh IUCN Red List data for every organism document (ordered by ``taxid``).

    One HTTP request per organism (plus pauses); suitable for a manual or scheduled full refresh.
    """
    token = _api_token()
    if not token:
        logger.error("IUCN backfill skipped: set IUCN_TOKEN or UICN_TOKEN in the environment")
        return {
            "status": "skipped",
            "reason": "missing_token",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    organisms: List[Organism] = list(Organism.objects().order_by("taxid"))
    if not organisms:
        return {
            "status": "skipped",
            "reason": "no_candidates",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    session = _session()
    ok = not_found = errors = 0
    for org in organisms:
        try:
            outcome = sync_organism_iucn(org, session, token)
            if outcome == "ok":
                ok += 1
            elif outcome == "not_found":
                not_found += 1
            else:
                errors += 1
        except Exception:
            logger.exception("IUCN sync failed for taxid %s", org.taxid)
            errors += 1
        _inter_organism_pause()

    processed = ok + not_found + errors
    return {
        "status": "ok",
        "processed": processed,
        "ok": ok,
        "not_found": not_found,
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# Bulk rank-based fetch (replaces per-organism taxa/scientific_name lookups)
# ---------------------------------------------------------------------------

def _run_bulk_rank_fetch_streaming(
    base_mongo_filter: Dict[str, Any],
    session: requests.Session,
    token: str,
) -> Tuple[int, int, int]:
    """
    Stream organisms from the database grouped by their highest-priority lineage
    rank (family → order → class → phylum) without loading the full collection
    into RAM.

    Strategy:
    - For each rank level in priority order, call ``collection.distinct()`` to get
      the set of rank_name strings that exist among matching organisms (just strings,
      no Organism objects in memory).
    - For each rank_name, paginate the IUCN ``taxa/{rank}/{name}`` endpoint to build
      the name→assessment_id lookup, then stream matching organisms via a
      ``no_cache()`` MongoEngine cursor and resolve them one at a time.
    - Each processed rank level is accumulated into ``absent_conditions`` so the
      next (lower-priority) rank excludes organisms already handled.
    - Organisms with no usable rank at any level are handled via the per-organism
      fallback path.

    ``base_mongo_filter`` is ANDed into every query; callers use it to scope by
    taxid set, IUCN state, or leave it ``{}`` for all organisms.

    Returns ``(ok, not_found, errors)``.
    """
    org_coll = Organism._get_collection()
    ok = not_found = errors = 0
    absent_conditions: Dict[str, Any] = {}

    for url_rank, db_attr in _RANK_PRIORITY:
        rank_field = f"lineage_rank_labels.{db_attr}"

        # Exclusive filter: all higher-priority ranks must be absent for this rank.
        # MongoDB treats {field: {$in: [None, ""]}} as matching null, "", and missing.
        exclusive_filter: Dict[str, Any] = {
            **base_mongo_filter,
            **absent_conditions,
            rank_field: {"$nin": [None, ""]},
        }

        rank_names: List[str] = org_coll.distinct(rank_field, exclusive_filter)

        for rank_name in rank_names:
            per_rank_filter = {**exclusive_filter, rank_field: rank_name}
            logger.info(
                "IUCN bulk fetch: scanning %s/%s",
                url_rank,
                rank_name,
            )
            try:
                name_to_aid = _fetch_all_taxa_for_rank(
                    session, token, url_rank, rank_name
                )
            except Exception:
                logger.exception(
                    "IUCN bulk fetch: failed to paginate %s/%s — falling back to per-organism",
                    url_rank,
                    rank_name,
                )
                for org in Organism.objects(__raw__=per_rank_filter).no_cache():
                    try:
                        outcome = sync_organism_iucn(org, session, token)
                        if outcome == "ok":
                            ok += 1
                        elif outcome == "not_found":
                            not_found += 1
                        else:
                            errors += 1
                    except Exception:
                        logger.exception("IUCN sync failed for taxid %s", org.taxid)
                        errors += 1
                    _inter_organism_pause()
                continue

            for org in Organism.objects(__raw__=per_rank_filter).no_cache():
                try:
                    outcome = _sync_organism_from_lookup(
                        org, name_to_aid, session, token
                    )
                    if outcome == "ok":
                        ok += 1
                    elif outcome == "not_found":
                        not_found += 1
                    else:
                        errors += 1
                except Exception:
                    logger.exception("IUCN sync failed for taxid %s", org.taxid)
                    errors += 1

        # Mark this rank as absent for subsequent lower-priority rank queries.
        absent_conditions[rank_field] = {"$in": [None, ""]}

    # Fallback: organisms with none of the four ranks populated.
    fallback_filter: Dict[str, Any] = {**base_mongo_filter, **absent_conditions}
    for org in Organism.objects(__raw__=fallback_filter).no_cache():
        logger.debug(
            "IUCN fallback (no rank): taxid=%s name=%s", org.taxid, org.scientific_name
        )
        try:
            outcome = sync_organism_iucn(org, session, token)
            if outcome == "ok":
                ok += 1
            elif outcome == "not_found":
                not_found += 1
            else:
                errors += 1
        except Exception:
            logger.exception("IUCN sync failed for taxid %s", org.taxid)
            errors += 1
        _inter_organism_pause()

    return ok, not_found, errors


def _pick_best_aid_from_assessments(items: List[Dict[str, Any]]) -> Optional[int]:
    """
    From a list of flat assessment dicts (as returned by ``taxa/{rank}/{name}``),
    return the assessment_id that best represents the current status:
      priority 0 — latest=True  + global scope (code "1")
      priority 1 — latest=True  (any scope)
      priority 2 — any entry    (first encountered)
    """
    best_aid: Optional[int] = None
    best_priority = 99

    for item in items:
        if not isinstance(item, dict):
            continue
        raw = item.get("assessment_id")
        if raw is None:
            continue
        try:
            aid = int(raw)
        except (TypeError, ValueError):
            continue

        is_latest = bool(item.get("latest"))
        is_global = any(
            str(sc.get("code") or "") == "1"
            for sc in (item.get("scopes") or [])
            if isinstance(sc, dict)
        )

        if is_latest and is_global:
            priority = 0
        elif is_latest:
            priority = 1
        else:
            priority = 2

        if priority < best_priority:
            best_priority = priority
            best_aid = aid
            if priority == 0:
                break  # can't do better

    return best_aid


def _fetch_all_taxa_for_rank(
    session: requests.Session,
    token: str,
    url_rank: str,
    rank_name: str,
) -> Dict[str, int]:
    """
    Paginate through ``taxa/{url_rank}/{rank_name}`` and build a lookup dict
    ``{normalized_scientific_name: best_assessment_id}``.

    Each page is fetched with an additional ``_RANK_PAGE_DELAY`` sleep on top of
    the standard ``_throttle()`` inside ``_get_v4``.

    The API returns a flat list under ``"assessments"`` (100 per page). Multiple
    historical entries per species are expected; ``_pick_best_aid_from_assessments``
    selects the global + latest one.
    """
    path = f"taxa/{url_rank}/{urllib.parse.quote(rank_name, safe='')}"
    name_to_aid: Dict[str, int] = {}
    # Accumulate all raw assessment items per normalised name so
    # priority selection runs across the whole page at once.
    per_name: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    page = 1

    while True:
        time.sleep(_RANK_PAGE_DELAY)
        data, _ = _get_v4(session, token, path, params={"page": page})
        if data is None:
            logger.warning(
                "IUCN rank fetch: no data for %s/%s page %d — stopping pagination",
                url_rank,
                rank_name,
                page,
            )
            break

        items: List[Dict[str, Any]] = data.get("assessments") or []
        for item in items:
            sci = (item.get("taxon_scientific_name") or "").strip()
            if not sci:
                continue
            per_name[normalize_binomial(sci)].append(item)

        logger.debug(
            "IUCN rank fetch: %s/%s page %d → %d assessments",
            url_rank,
            rank_name,
            page,
            len(items),
        )

        if len(items) < 100:
            break
        page += 1

    for norm_name, candidates in per_name.items():
        aid = _pick_best_aid_from_assessments(candidates)
        if aid is not None:
            name_to_aid[norm_name] = aid

    logger.info(
        "IUCN rank fetch: %s/%s → %d unique taxa across %d page(s)",
        url_rank,
        rank_name,
        len(name_to_aid),
        page,
    )
    return name_to_aid


def _sync_organism_from_lookup(
    org: Organism,
    name_to_aid: Dict[str, int],
    session: requests.Session,
    token: str,
) -> str:
    """
    Look up *org* in the pre-fetched rank name→assessment_id dict, fetch the full
    assessment, and save. Returns 'ok', 'not_found', or 'error'.
    """
    aid: Optional[int] = None
    for candidate in iucn_name_candidates(org.scientific_name or ""):
        aid = name_to_aid.get(normalize_binomial(candidate))
        if aid is not None:
            break

    if aid is None:
        org.iucn_redlist = _assessment_to_embedded(None, not_found=True)
        org.save()
        return "not_found"

    full, _ = _get_v4(session, token, f"assessment/{aid}")
    if full is None:
        org.iucn_redlist = _assessment_to_embedded(None, not_found=True)
        org.save()
        return "error"

    org.iucn_redlist = _assessment_to_embedded(full, not_found=False, assessment_id=aid)
    org.save()
    return "ok"




def run_iucn_fetch_bulk_by_rank(
    taxids: List[str],
    *,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Update IUCN Red List embedded docs for the given NCBI taxids using the bulk
    rank-based strategy.

    Organisms are grouped by their highest available lineage rank (family → order →
    class → phylum). For each group the ``taxa/{rank}/{rank_name}`` paginated endpoint
    is scraped to build a name→assessment_id lookup (100 assessments per page, with a
    ``_RANK_PAGE_DELAY`` extra sleep per page). Individual ``assessment/{id}`` calls
    are made only for organisms whose scientific name appears in the lookup.

    If ``force`` is False, organisms that already have ``iucn_redlist`` set are skipped.
    Organisms with no usable lineage rank fall back to the per-organism
    ``taxa/scientific_name`` path.
    """
    token = _api_token()
    if not token:
        logger.error("IUCN fetch skipped: set IUCN_TOKEN or UICN_TOKEN in the environment")
        return {
            "status": "skipped",
            "reason": "missing_token",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    ids = [str(t).strip() for t in taxids if str(t).strip()]
    if not ids:
        return {
            "status": "skipped",
            "reason": "no_taxids",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    org_coll = Organism._get_collection()
    taxid_filter: Dict[str, Any] = {"taxid": {"$in": ids}}
    not_in_db_errors = len(ids) - org_coll.count_documents(taxid_filter)

    # force=False: only process organisms that have never been attempted (iucn_redlist is null).
    # force=True: process all matching organisms regardless of existing iucn_redlist state.
    iucn_filter: Dict[str, Any] = {} if force else {"iucn_redlist": None}
    base_filter: Dict[str, Any] = {**taxid_filter, **iucn_filter}

    if org_coll.count_documents(base_filter) == 0:
        return {
            "status": "skipped",
            "reason": "no_candidates",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": not_in_db_errors,
            "force": force,
        }

    session = _session()
    ok, not_found, bulk_errors = _run_bulk_rank_fetch_streaming(
        base_filter, session, token
    )
    errors = not_in_db_errors + bulk_errors
    processed = ok + not_found + errors
    return {
        "status": "ok",
        "processed": processed,
        "ok": ok,
        "not_found": not_found,
        "errors": errors,
        "force": force,
    }


def run_iucn_backfill_by_rank() -> Dict[str, Any]:
    """
    Refresh ``Organism.iucn_redlist`` from the IUCN API for every organism in the
    database using the bulk rank-based strategy.

    Organisms are streamed and grouped by lineage rank so a single
    ``taxa/{rank}/{name}`` pagination covers all organisms in that group rather than
    one API call per species. No organism list is loaded into RAM.
    """
    token = _api_token()
    if not token:
        logger.error("IUCN backfill skipped: set IUCN_TOKEN or UICN_TOKEN in the environment")
        return {
            "status": "skipped",
            "reason": "missing_token",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    if Organism._get_collection().count_documents({}) == 0:
        return {
            "status": "skipped",
            "reason": "no_candidates",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    session = _session()
    ok, not_found, errors = _run_bulk_rank_fetch_streaming({}, session, token)
    processed = ok + not_found + errors
    return {
        "status": "ok",
        "processed": processed,
        "ok": ok,
        "not_found": not_found,
        "errors": errors,
    }


def run_iucn_refresh_known_assessments() -> Dict[str, Any]:
    """
    Re-fetch the full assessment for every organism that already has a cached
    ``iucn_redlist.assessment_id``.

    Skips the rank page scan entirely — goes directly to ``assessment/{id}`` for
    each organism — so this is much faster than the full bulk fetch and suitable
    for routine periodic refreshes of known-listed species.
    """
    token = _api_token()
    if not token:
        logger.error(
            "IUCN refresh skipped: set IUCN_TOKEN or UICN_TOKEN in the environment"
        )
        return {
            "status": "skipped",
            "reason": "missing_token",
            "processed": 0,
            "ok": 0,
            "errors": 0,
        }

    has_aid_filter = {"iucn_redlist.assessment_id": {"$exists": True, "$ne": None}}
    org_coll = Organism._get_collection()
    count = org_coll.count_documents(has_aid_filter)

    if count == 0:
        return {
            "status": "skipped",
            "reason": "no_candidates",
            "processed": 0,
            "ok": 0,
            "errors": 0,
        }

    logger.info(
        "IUCN refresh known assessments: %d organism(s) with cached assessment_id",
        count,
    )

    session = _session()
    ok = errors = 0
    for org in Organism.objects(__raw__=has_aid_filter).no_cache():
        aid = org.iucn_redlist.assessment_id
        try:
            full, _ = _get_v4(session, token, f"assessment/{aid}")
            if full is None:
                logger.warning(
                    "IUCN refresh: assessment/%s returned nothing for taxid=%s",
                    aid,
                    org.taxid,
                )
                errors += 1
                continue
            org.iucn_redlist = _assessment_to_embedded(
                full, not_found=False, assessment_id=aid
            )
            org.save()
            ok += 1
        except Exception:
            logger.exception(
                "IUCN refresh failed for taxid=%s assessment_id=%s", org.taxid, aid
            )
            errors += 1

    processed = ok + errors
    logger.info(
        "IUCN refresh known assessments: finished — ok=%d errors=%d", ok, errors
    )
    return {
        "status": "ok",
        "processed": processed,
        "ok": ok,
        "errors": errors,
    }


def run_iucn_fetch_missing_redlist() -> Dict[str, Any]:
    """
    Run the bulk rank-based fetch for organisms that have not yet been successfully
    assessed: those with ``iucn_redlist`` as ``None`` (never attempted) and those
    with ``not_found=True`` (previously not listed — re-checked because IUCN may have
    added a new assessment since the last run).

    Organisms that already have a cached ``assessment_id`` are excluded; use
    ``run_iucn_refresh_known_assessments`` to refresh those.
    """
    token = _api_token()
    if not token:
        logger.error(
            "IUCN fetch-missing skipped: set IUCN_TOKEN or UICN_TOKEN in the environment"
        )
        return {
            "status": "skipped",
            "reason": "missing_token",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    missing_filter: Dict[str, Any] = {
        "$or": [
            {"iucn_redlist": None},
            {"iucn_redlist.not_found": True},
        ]
    }
    org_coll = Organism._get_collection()
    count = org_coll.count_documents(missing_filter)

    if count == 0:
        return {
            "status": "skipped",
            "reason": "no_candidates",
            "processed": 0,
            "ok": 0,
            "not_found": 0,
            "errors": 0,
        }

    logger.info(
        "IUCN fetch-missing: %d organism(s) with no iucn_redlist or not_found=True",
        count,
    )

    session = _session()
    ok, not_found, errors = _run_bulk_rank_fetch_streaming(
        missing_filter, session, token
    )
    processed = ok + not_found + errors
    logger.info(
        "IUCN fetch-missing: finished — ok=%d not_found=%d errors=%d",
        ok,
        not_found,
        errors,
    )
    return {
        "status": "ok",
        "processed": processed,
        "ok": ok,
        "not_found": not_found,
        "errors": errors,
    }
