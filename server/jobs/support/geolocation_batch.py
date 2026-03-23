"""
Geolocation side effects for catalog biosamples / local samples (job-oriented).

Keeps coordinate extraction, SampleCoordinates upsert, and organism country
enrichment in one place; batch entry points prefetch organism lineages to avoid
N+1 queries on large imports.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, List, Optional, Sequence, Tuple

from shapely.geometry import Point, shape

from db.model import BioSample, Organism, SampleCoordinates

logger = logging.getLogger(__name__)

# Same default as biosample import jobs (bounded $in lists).
_ACCESSION_BATCH_SIZE = int(os.getenv("BIOSAMPLE_IMPORT_ACCESSION_BATCH", "5000"))

_COORD_NORMALIZE = str.maketrans(",'", "..")

_server_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_COUNTRIES_PATH = os.path.join(_server_root, "countries.json")

_country_polygons_cache: Optional[List[Tuple[Any, str, str]]] = None
_country_name_to_id_cache: Optional[dict] = None


def _convert_coordinates(lat, lat_value, long, long_value):
    lat = "-" + lat if lat_value == "S" else lat
    long = "-" + long if long_value == "W" else long
    return lat, long


def _countries_json_path() -> str:
    if os.path.isfile(_COUNTRIES_PATH):
        return _COUNTRIES_PATH
    return os.path.abspath("./countries.json")


def _get_country_polygons():
    global _country_polygons_cache, _country_name_to_id_cache
    if _country_polygons_cache is not None:
        return _country_polygons_cache, _country_name_to_id_cache

    path = _countries_json_path()
    try:
        with open(path, encoding="utf-8") as f:
            features = json.load(f)["features"]
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as e:
        logger.warning("Could not load country polygons from %s: %s", path, e)
        _country_polygons_cache = []
        _country_name_to_id_cache = {}
        return _country_polygons_cache, _country_name_to_id_cache

    _country_polygons_cache = [
        (shape(c["geometry"]), c["id"], c["properties"]["name"]) for c in features
    ]
    _country_name_to_id_cache = {name: cid for _, cid, name in _country_polygons_cache}
    return _country_polygons_cache, _country_name_to_id_cache


def _point_from_stored(value) -> Optional[Point]:
    """Build a shapely Point from mongoengine PointField / GeoJSON-like values."""
    if value is None:
        return None
    if isinstance(value, Point):
        return value
    if hasattr(value, "x") and hasattr(value, "y"):
        try:
            return Point(float(value.x), float(value.y))
        except (TypeError, ValueError):
            return None
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        try:
            return Point(float(value[0]), float(value[1]))
        except (TypeError, ValueError):
            return None
    if isinstance(value, dict):
        coords = value.get("coordinates")
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            try:
                return Point(float(coords[0]), float(coords[1]))
            except (TypeError, ValueError):
                return None
    return None


def _parse_lat_lng_from_metadata(metadata: dict) -> Tuple[Optional[str], Optional[str]]:
    lowered = {k.lower(): v for k, v in metadata.items()}
    latitude, longitude = None, None
    for k, v in lowered.items():
        if k in ("lat_lon", "lat lon"):
            parts = str(v).split()
            if len(parts) == 4:
                latitude, longitude = _convert_coordinates(*parts)
        elif "latitude" in k:
            latitude = v
        elif "longitude" in k:
            longitude = v
        elif k == "lat":
            latitude = v
        elif k in ("lon", "long"):
            longitude = v
    return latitude, longitude


def _metadata_country_token(metadata: dict) -> Optional[str]:
    geo_loc = None
    for attr in metadata:
        low = attr.lower()
        if low == "geo_loc_name" or low == "country" or "country" in low:
            geo_loc = metadata.get(attr)
            break
    if not geo_loc:
        return None
    s = str(geo_loc).strip()
    if ":" in s or "|" in s:
        return s.split(":")[0].strip()
    return s


def save_coordinates(
    saved_sample,
    id_field: str = "accession",
    *,
    lineage_by_taxid: Optional[dict] = None,
) -> None:
    """
    Parse lat/lon from sample metadata and upsert SampleCoordinates.
    When ``lineage_by_taxid`` is provided (taxid -> lineage list), skips per-sample Organism lookup.
    """
    sample_metadata = saved_sample.metadata or {}
    latitude, longitude = _parse_lat_lng_from_metadata(sample_metadata)
    if latitude is None or longitude is None:
        return

    try:
        lat = float(str(latitude).translate(_COORD_NORMALIZE))
        lng = float(str(longitude).translate(_COORD_NORMALIZE))
    except ValueError:
        logger.warning(
            "Invalid latitude %r or longitude %r for sample %s",
            latitude,
            longitude,
            saved_sample[id_field],
        )
        return

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        return

    sample_accession = saved_sample[id_field]
    coords = [lng, lat]

    existing = SampleCoordinates.objects(sample_accession=sample_accession).first()
    if existing:
        existing.coordinates = coords
        existing.save()
        return

    taxid = getattr(saved_sample, "taxid", None) or ""
    scientific_name = getattr(saved_sample, "scientific_name", None) or ""
    lineage = None
    if lineage_by_taxid is not None and taxid:
        lineage = lineage_by_taxid.get(taxid)
    if lineage is None and taxid:
        org = Organism.objects(taxid=taxid).only("taxon_lineage").first()
        lineage = org.taxon_lineage if org else []

    doc = {
        "sample_accession": sample_accession,
        "taxid": taxid,
        "scientific_name": scientific_name,
        "coordinates": coords,
        "lineage": lineage or [],
    }
    if id_field == "local_id":
        doc["is_local_sample"] = True
    SampleCoordinates(**doc).save()


def update_countries_from_biosample(saved_biosample, sample_id) -> None:
    """Add a country id to the organism from metadata or point-in-polygon lookup."""
    metadata = saved_biosample.metadata or {}
    country_polygons, name_to_id = _get_country_polygons()

    country_name = _metadata_country_token(metadata)
    country_to_add = name_to_id.get(country_name) if country_name else None

    if not country_to_add and country_name and name_to_id:
        lowered_map = {k.lower(): v for k, v in name_to_id.items()}
        country_to_add = lowered_map.get(country_name.lower())

    if not country_to_add:
        coords_doc = SampleCoordinates.objects(sample_accession=sample_id).only("coordinates").first()
        point = _point_from_stored(coords_doc.coordinates if coords_doc else None)
        if point:
            for polygon, cid, _ in country_polygons:
                if polygon.contains(point):
                    country_to_add = cid
                    break

    taxid = getattr(saved_biosample, "taxid", None)
    if country_to_add and taxid:
        Organism.objects(taxid=taxid).modify(add_to_set__countries=country_to_add)


def update_geolocations(saved_biosample_accessions: Sequence[str]) -> None:
    """Run coordinate + country updates for biosample accessions (chunked, batched lineage)."""
    accs = [a for a in saved_biosample_accessions if a]
    if not accs:
        return

    for i in range(0, len(accs), _ACCESSION_BATCH_SIZE):
        chunk = accs[i : i + _ACCESSION_BATCH_SIZE]
        biosamples = list(
            BioSample.objects(accession__in=chunk).only(
                "accession", "taxid", "scientific_name", "metadata"
            )
        )
        if not biosamples:
            continue

        taxids = {b.taxid for b in biosamples if getattr(b, "taxid", None)}
        lineage_by_taxid = {
            o.taxid: o.taxon_lineage
            for o in Organism.objects(taxid__in=list(taxids)).only("taxid", "taxon_lineage")
        }

        for biosample in biosamples:
            save_coordinates(
                biosample, id_field="accession", lineage_by_taxid=lineage_by_taxid
            )
            update_countries_from_biosample(biosample, biosample.accession)
