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
"""

from __future__ import annotations

import email.utils
import logging
import os
import random
import re
import time
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
            if isinstance(val, str) and val.strip():
                cap = min(8000, _DOC_MAX) if _DOC_MAX > 0 else 8000
                out[str(key)] = val.strip()[:cap] if cap else val.strip()

    sup = assessment.get("supplementary_info")
    if isinstance(sup, dict):
        for key, val in sup.items():
            if isinstance(val, str) and val.strip():
                out[f"supplementary_{key}"] = val.strip()[:8000]
            elif isinstance(val, (int, float, bool)):
                out[f"supplementary_{key}"] = val

    return out


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

    habitats = _as_dict_list(assessment.get("habitats"))
    threats = _as_dict_list(assessment.get("threats"))
    narratives = _narratives_from_assessment(assessment)

    return OrganismRedList(
        not_found=False,
        category=_red_list_category_code(assessment.get("red_list_category")),
        population_trend=_scalar_str(assessment.get("population_trend")),
        assessment_date=_scalar_str(assessment.get("assessment_date")),
        published_year=_scalar_str(assessment.get("year_published")),
        habitats=habitats,
        threats=threats,
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


def run_iucn_backfill_missing(
    *,
    max_organisms: int = 120,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Populate ``iucn_redlist`` for organisms where it is absent (or all, if ``force``).

    ``max_organisms`` caps how many documents are processed per run (rate limits).
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

    max_organisms = max(int(max_organisms), 1)
    q = Organism.objects()
    if not force:
        q = q.filter(iucn_redlist=None)

    organisms: List[Organism] = list(q.order_by("taxid").limit(max_organisms))
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
        "max_organisms": max_organisms,
        "force": force,
    }
