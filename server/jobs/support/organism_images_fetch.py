"""
Fetch attributed species images from iNaturalist, Wikimedia Commons, and GBIF.

Respects a conservative license allowlist and skips organisms that already have
enough ``images`` (see task / env ``ORGANISM_IMAGE_MIN_COUNT``).
"""

from __future__ import annotations

import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import quote, unquote

import requests

from db.embedded_docs import OrganismImage
from db.model import Organism

logger = logging.getLogger(__name__)

INAT_BASE = "https://api.inaturalist.org/v1"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
GBIF_API = "https://api.gbif.org/v1"

_REQUEST_TIMEOUT = (5, 30)
_DEFAULT_MIN_IMAGES = 3
_DEFAULT_MAX_ORGANISMS = int(os.getenv("ORGANISM_IMAGE_MAX_ORGANISMS", "500"))
_THROTTLE_SEC = float(os.getenv("ORGANISM_IMAGE_HTTP_THROTTLE", "0.35"))
_USER_AGENT = os.getenv(
    "ORGANISM_IMAGE_HTTP_USER_AGENT",
    "BioGenomePortal/1.0 (organism image backfill; +https://github.com/)",
)

def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": _USER_AGENT, "Accept": "application/json"})
    return s


def _throttle() -> None:
    if _THROTTLE_SEC > 0:
        time.sleep(_THROTTLE_SEC)


def canonical_binomial(name: str) -> str:
    """Lowercase binomial without a trailing parenthetical author."""
    s = " ".join((name or "").strip().split())
    s = re.sub(r"\s*\([^)]*\)\s*$", "", s)
    return " ".join(s.split()).lower()


def license_is_allowlisted(raw: Optional[str]) -> Optional[Tuple[str, Optional[str]]]:
    """
    If the license is allowlisted, return (normalized_label, license_url).
    Rejects NC, ND, and unknown / all-rights-reserved style strings.
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    low = s.lower()

    if "all rights reserved" in low or low in ("c", "copyright", "©"):
        return None
    if "noncommercial" in low or "non-commercial" in low:
        return None
    if "no_derivatives" in low or "no derivatives" in low:
        return None
    if re.search(r"\bnc\b", low) and "cc" in low:
        return None
    if re.search(r"\bnd\b", low) and "cc" in low:
        return None
    if "-nc" in low or "_nc" in low:
        return None
    if "-nd" in low or "_nd" in low:
        return None

    if low.startswith("http://") or low.startswith("https://"):
        if "creativecommons.org/licenses/by-sa/" in low:
            m = re.search(r"/by-sa/([\d.]+)/?", low)
            ver = m.group(1) if m else ""
            return (f"CC-BY-SA-{ver}" if ver else "CC-BY-SA", s)
        if (
            "creativecommons.org/licenses/by/" in low
            and "by-sa" not in low
            and "by-nc" not in low
            and "by-nd" not in low
        ):
            m = re.search(r"/by/([\d.]+)/?", low)
            ver = m.group(1) if m else ""
            return (f"CC-BY-{ver}" if ver else "CC-BY", s)
        if "creativecommons.org/publicdomain/zero/" in low:
            return "CC0-1.0", s
        if (
            "creativecommons.org/publicdomain/mark/" in low
            or "creativecommons.org/licenses/publicdomain" in low
        ):
            return "public_domain", s
        return None

    # iNaturalist codes
    if low in ("cc0",):
        return "CC0", None
    if low in ("cc-by", "cc_by"):
        return "CC-BY", None
    if low in ("cc-by-sa", "cc_by_sa"):
        return "CC-BY-SA", None

    # Commons-style short names
    if "cc0" in low and "by" not in low and "nc" not in low:
        return "CC0", None
    if "public domain" in low or low == "pd":
        return "public_domain", None
    if "cc by-sa" in low or "cc-by-sa" in low:
        if "nc" in low or "nd" in low:
            return None
        return "CC-BY-SA", None
    if re.match(r"^cc\s*by\s*[\d.]*\s*$", low) or low.startswith("cc by "):
        if "nc" in low or "nd" in low or "sa" in low:
            return None
        return "CC-BY", None

    return None


def _inat_photo_large_url(square_or_medium_url: str, photo_id: Optional[int] = None) -> str:
    u = square_or_medium_url
    for size in ("square", "medium", "small", "thumb"):
        if f"/{size}." in u:
            return u.replace(f"/{size}.", "/original.")
    if photo_id and "inaturalist" in u:
        return f"https://inaturalist-open-data.s3.amazonaws.com/photos/{photo_id}/original.jpg"
    return u


def _fetch_inat_images(
    session: requests.Session,
    scientific_name: str,
    need: int,
    existing_urls: Set[str],
) -> List[OrganismImage]:
    out: List[OrganismImage] = []
    target = canonical_binomial(scientific_name)
    if not target:
        return out

    _throttle()
    r = session.get(
        f"{INAT_BASE}/taxa",
        params={
            "q": scientific_name.strip(),
            "rank": "species",
            "per_page": 20,
            "order": "desc",
            "order_by": "observations_count",
        },
        timeout=_REQUEST_TIMEOUT,
    )
    r.raise_for_status()
    data = r.json()
    taxon_id = None
    for t in data.get("results") or []:
        if (t.get("rank") or "").lower() != "species":
            continue
        if canonical_binomial(t.get("name") or "") != target:
            continue
        taxon_id = t.get("id")
        break
    if not taxon_id:
        return out

    _throttle()
    r2 = session.get(
        f"{INAT_BASE}/observations",
        params={
            "taxon_id": taxon_id,
            "quality_grade": "research",
            "photos": "true",
            "per_page": 50,
            "order": "desc",
            "order_by": "created_at",
        },
        timeout=_REQUEST_TIMEOUT,
    )
    r2.raise_for_status()
    obs_data = r2.json()

    for obs in obs_data.get("results") or []:
        if len(out) >= need:
            break
        tx = obs.get("taxon") or {}
        if (tx.get("rank") or "").lower() != "species":
            continue
        if int(tx.get("id") or 0) != int(taxon_id):
            continue
        if canonical_binomial(tx.get("name") or "") != target:
            continue

        obs_uri = obs.get("uri") or ""
        user = obs.get("user") or {}
        author = (user.get("name") or user.get("login") or "").strip() or None

        for ph in obs.get("photos") or []:
            if len(out) >= need:
                break
            lic_raw = ph.get("license_code")
            allowed = license_is_allowlisted(lic_raw)
            if not allowed:
                continue
            label, lic_url = allowed
            url = _inat_photo_large_url(ph.get("url") or "", ph.get("id"))
            if not url or not url.startswith("http"):
                continue
            if url in existing_urls:
                continue
            existing_urls.add(url)
            out.append(
                OrganismImage(
                    url=url,
                    author=author,
                    license=label,
                    license_url=lic_url,
                    source_record_url=obs_uri or None,
                )
            )
    return out


def _commons_category_matches_taxon(category_title: str, binomial_norm: str) -> bool:
    """Require a category whose normalized title equals the species binomial."""
    title = category_title
    if title.lower().startswith("category:"):
        title = title[9:]
    title = unquote(title.replace("_", " ")).strip()
    return canonical_binomial(title) == binomial_norm


def _fetch_commons_images(
    session: requests.Session,
    scientific_name: str,
    need: int,
    existing_urls: Set[str],
) -> List[OrganismImage]:
    out: List[OrganismImage] = []
    binomial_norm = canonical_binomial(scientific_name)
    if not binomial_norm:
        return out

    _throttle()
    r = session.get(
        COMMONS_API,
        params={
            "action": "query",
            "format": "json",
            "list": "search",
            "srsearch": f'"{scientific_name.strip()}" filetype:bitmap',
            "srnamespace": 6,
            "srlimit": min(15, max(need * 5, 5)),
        },
        timeout=_REQUEST_TIMEOUT,
    )
    r.raise_for_status()
    search = r.json().get("query", {}).get("search") or []

    for hit in search:
        if len(out) >= need:
            break
        title = hit.get("title")
        if not title:
            continue

        _throttle()
        r2 = session.get(
            COMMONS_API,
            params={
                "action": "query",
                "format": "json",
                "titles": title,
                "prop": "imageinfo|categories",
                "iiprop": "url|extmetadata",
                "cllimit": "max",
            },
            timeout=_REQUEST_TIMEOUT,
        )
        r2.raise_for_status()
        pages = r2.json().get("query", {}).get("pages") or {}
        for _pid, page in pages.items():
            cats = page.get("categories") or []
            if not any(
                _commons_category_matches_taxon(c.get("title", ""), binomial_norm)
                for c in cats
            ):
                continue
            infos = page.get("imageinfo") or []
            if not infos:
                continue
            info = infos[0]
            url = info.get("url")
            if not url:
                continue
            meta = info.get("extmetadata") or {}
            lic_short = (meta.get("LicenseShortName") or {}).get("value")
            lic_url_meta = (meta.get("LicenseUrl") or {}).get("value")
            artist = (meta.get("Artist") or {}).get("value")
            if artist:
                artist = re.sub(r"<[^>]+>", "", artist)
                artist = " ".join(artist.split()) or None

            allowed = license_is_allowlisted(lic_short) or license_is_allowlisted(lic_url_meta)
            if not allowed:
                continue
            label, lic_url = allowed
            if not lic_url and lic_url_meta:
                lic_url = lic_url_meta.strip() or None

            wiki_title = title.replace(" ", "_")
            file_page = "https://commons.wikimedia.org/wiki/" + quote(wiki_title, safe="/():'!%")

            if url in existing_urls:
                continue
            existing_urls.add(url)
            out.append(
                OrganismImage(
                    url=url,
                    author=artist,
                    license=label,
                    license_url=lic_url,
                    source_record_url=file_page,
                )
            )
    return out


def _fetch_gbif_images(
    session: requests.Session,
    scientific_name: str,
    need: int,
    existing_urls: Set[str],
) -> List[OrganismImage]:
    out: List[OrganismImage] = []
    target = canonical_binomial(scientific_name)
    if not target:
        return out

    _throttle()
    r = session.get(
        f"{GBIF_API}/species/match",
        params={"name": scientific_name.strip(), "strict": "false"},
        timeout=_REQUEST_TIMEOUT,
    )
    r.raise_for_status()
    match = r.json()
    if match.get("matchType") in ("NONE",):
        return out
    if (match.get("rank") or "").upper() != "SPECIES":
        return out
    canon = canonical_binomial(match.get("canonicalName") or "")
    if not canon:
        canon = canonical_binomial(match.get("scientificName") or "")
    if canon != target:
        return out
    usage_key = match.get("usageKey")
    if not usage_key:
        return out
    _throttle()
    r2 = session.get(
        f"{GBIF_API}/occurrence/search",
        params={
            "taxonKey": usage_key,
            "mediaType": "StillImage",
            "limit": 40,
        },
        timeout=_REQUEST_TIMEOUT,
    )
    r2.raise_for_status()
    occ_data = r2.json()

    for rec in occ_data.get("results") or []:
        if len(out) >= need:
            break
        occ_key = rec.get("key")
        media_list = rec.get("media") or []
        for media in media_list:
            if len(out) >= need:
                break
            if (media.get("type") or "").lower() != "stillimage":
                continue
            url = media.get("identifier")
            if not url or not str(url).startswith("http"):
                continue
            lic_raw = media.get("license") or media.get("rights")
            allowed = license_is_allowlisted(lic_raw)
            if not allowed:
                continue
            label, lic_url = allowed
            record_url = f"https://www.gbif.org/occurrence/{occ_key}" if occ_key else None
            if url in existing_urls:
                continue
            existing_urls.add(url)
            creator = (media.get("creator") or "").strip() or None
            out.append(
                OrganismImage(
                    url=url,
                    author=creator,
                    license=label,
                    license_url=lic_url,
                    source_record_url=record_url,
                )
            )
    return out


def _collect_existing_sets(organism: Organism) -> Set[str]:
    urls: Set[str] = set()
    for img in organism.images or []:
        if img.url:
            urls.add(img.url)
    return urls


def _dedupe_images_keep_last(images: List[OrganismImage]) -> List[OrganismImage]:
    """Deduplicate by URL while preserving the last occurrence of each URL."""
    seen: Set[str] = set()
    deduped_reversed: List[OrganismImage] = []
    for img in reversed(images):
        if not img.url:
            deduped_reversed.append(img)
            continue
        if img.url in seen:
            continue
        seen.add(img.url)
        deduped_reversed.append(img)
    deduped_reversed.reverse()
    return deduped_reversed


def fetch_images_for_organism(
    organism: Organism,
    session: requests.Session,
    min_images: int,
) -> int:
    """
    Append up to ``min_images`` total images (existing + new).
    Returns number of new images appended.
    """
    existing = _dedupe_images_keep_last(list(organism.images or []))
    if existing != list(organism.images or []):
        organism.images = existing
        organism.save()
    if len(existing) >= min_images:
        return 0
    need = min_images - len(existing)
    scientific_name = organism.scientific_name or ""
    existing_urls = _collect_existing_sets(organism)
    new_docs: List[OrganismImage] = []

    new_docs.extend(
        _fetch_inat_images(session, scientific_name, need, existing_urls)
    )
    need = min_images - len(existing) - len(new_docs)
    if need > 0:
        new_docs.extend(
            _fetch_commons_images(session, scientific_name, need, existing_urls)
        )
    need = min_images - len(existing) - len(new_docs)
    if need > 0:
        new_docs.extend(
            _fetch_gbif_images(session, scientific_name, need, existing_urls)
        )

    if not new_docs:
        return 0

    organism.images = _dedupe_images_keep_last(existing + new_docs)
    organism.save()
    return len(new_docs)


def run_external_image_backfill(
    taxids: Optional[List[Any]] = None,
    min_images: Optional[int] = None,
    max_organisms: Optional[int] = None,
) -> Dict[str, Any]:
    """
    For each organism with fewer than ``min_images`` images, fetch from
    iNaturalist → Commons → GBIF until the quota is met or sources are exhausted.
    """
    min_c = int(min_images) if min_images is not None else int(
        os.getenv("ORGANISM_IMAGE_MIN_COUNT", str(_DEFAULT_MIN_IMAGES))
    )
    max_c = (
        int(max_organisms)
        if max_organisms is not None
        else (_DEFAULT_MAX_ORGANISMS if _DEFAULT_MAX_ORGANISMS > 0 else 0)
    )
    min_c = max(min_c, 1)

    session = _session()
    processed = 0
    updated = 0
    added_total = 0
    skipped_full = 0

    q = Organism.objects
    if taxids:
        q = q.filter(taxid__in=[str(t) for t in taxids])

    for org in q.order_by("taxid"):
        if max_c and processed >= max_c:
            break
        processed += 1
        normalized_images = _dedupe_images_keep_last(list(org.images or []))
        if normalized_images != list(org.images or []):
            org.images = normalized_images
            org.save()
        if len(org.images or []) >= min_c:
            skipped_full += 1
            continue
        try:
            n = fetch_images_for_organism(org, session, min_c)
            if n:
                updated += 1
                added_total += n
        except requests.RequestException as e:
            logger.warning(
                "organism_images_fetch: HTTP error for taxid=%s: %s",
                org.taxid,
                e,
            )
        except Exception:
            logger.exception(
                "organism_images_fetch: failed for taxid=%s", org.taxid
            )

    return {
        "status": "ok",
        "min_images": min_c,
        "processed": processed,
        "organisms_updated": updated,
        "images_added": added_total,
        "skipped_already_full": skipped_full,
    }
