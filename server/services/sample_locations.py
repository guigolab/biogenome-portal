import json
import logging

from db.model import (
    Assembly,
    BioSample,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    SampleCoordinates,
)
from helpers import geolocation
from helpers import resource_mixins as response_helper
from werkzeug.exceptions import BadRequest

logger = logging.getLogger(__name__)

MODELS = ['organisms', 'biosamples', 'reads', 'assemblies', 'local_samples', 'annotations']

MODEL_MAP = {
    'organisms': {
        'field': 'taxid',
        'queryset': lambda ids: Organism.objects(taxid__in=ids),
        'count_query': lambda ids: Organism.objects(taxid__in=ids).count(),
        'fields': ['taxid', 'scientific_name', 'insdc_common_name', 'tolid_prefix']
    },
    'biosamples': {
        'field': 'sample_accession',
        'queryset': lambda ids: BioSample.objects(accession__in=ids),
        'count_query': lambda ids: BioSample.objects(accession__in=ids).count(),
        'fields': ['accession', 'taxid', 'scientific_name']
    },
    'local_samples': {
        'field': 'sample_accession',
        'queryset': lambda ids: LocalSample.objects(local_id__in=ids),
        'count_query': lambda ids: LocalSample.objects(local_id__in=ids).count(),
        'fields': ['local_id', 'taxid', 'scientific_name']
    },
    'assemblies': {
        'field': 'sample_accession',
        'queryset': lambda ids: Assembly.objects(sample_accession__in=ids),
        'count_query': lambda ids: Assembly.objects(sample_accession__in=ids).count(),
        'fields': ['accession', 'assembly_name', 'sample_accession', 'taxid', 'scientific_name', 'metadata.assembly_info.assembly_level']
    },
    'reads': {
        'field': 'sample_accession',
        'queryset': lambda ids: ReadRun.objects(sample_accession__in=ids),
        'count_query': lambda ids: ReadRun.objects(sample_accession__in=ids).count(),
        'fields': ['run_accession', 'experiment_accession', 'sample_accession', 'taxid', 'scientific_name']
    },
    'annotations': {
        'field': 'sample_accession',
        'queryset': lambda ids: GenomeAnnotation.objects(assembly_accession__in=Assembly.objects(sample_accession__in=ids).only('accession').scalar('accession')),
        'count_query': lambda ids: GenomeAnnotation.objects(assembly_accession__in=Assembly.objects(sample_accession__in=ids).only('accession').scalar('accession')).count(),
        'fields': ['name', 'assembly_accession', 'assembly_name', 'taxid', 'scientific_name', 'gff_gz_location', 'tab_index_location']
    }
}


def _paginated_locations_payload(params):
    offset = int(params.get("offset", 0))
    limit = int(params.get("limit", 20))
    query = geolocation.create_query(params)
    coords = SampleCoordinates.objects(query).exclude("id").skip(offset).limit(limit)
    total = coords.count()
    return dict(total=total, data=list(coords.as_pymongo()))


def get_sample_locations(args):
    return _paginated_locations_payload(args)


def post_sample_locations(data):
    try:
        return _paginated_locations_payload(data)
    except Exception as e:
        logger.exception("post_sample_locations failed: %s", e)
        raise BadRequest(description=str(e))


def _frequency_request_dict(filter_args):
    """Normalize GET args, JSON body, or form into a plain dict for geo + organism filters."""
    if filter_args is None:
        return {}
    if isinstance(filter_args, dict):
        d = dict(filter_args)
    else:
        d = filter_args.to_dict(flat=True)
    poly = d.get("polygon")
    if isinstance(poly, str) and poly.strip().startswith("{"):
        try:
            d["polygon"] = json.loads(poly)
        except (json.JSONDecodeError, TypeError):
            pass
    return d


def _organism_lookup_match_from_qs(items):
    """MongoDB $match body for a $lookup subpipeline on the organism collection."""
    try:
        q = items._query
    except Exception:
        return {}
    if not q:
        return {}
    if isinstance(q, dict):
        return dict(q)
    return dict(q)


def _aggregate_unique_locations(filter_args):
    """
    Per coordinate, count distinct sample taxids whose organism matches the same catalog
    filters as GET /organisms (via $lookup), after SampleCoordinates geo/text filters.
    """
    from helpers import data as data_helper

    data = _frequency_request_dict(filter_args)

    if data.get("taxon_lineage") and not data.get("taxid"):
        data = dict(data)
        data["taxid"] = data["taxon_lineage"]

    sample_q = geolocation.create_query(data)
    try:
        org_items = data_helper.organism_queryset_for_map_filters(data)
    except BadRequest:
        raise
    except Exception as e:
        logger.exception("_aggregate_unique_locations organism filter failed: %s", e)
        raise BadRequest(description=str(e))

    sc_coll = SampleCoordinates._get_collection()
    org_coll = Organism._get_collection()

    sample_qs = SampleCoordinates.objects(sample_q)
    try:
        sample_match = dict(sample_qs._query) if sample_qs._query else {}
    except Exception:
        sample_match = {}

    org_match = _organism_lookup_match_from_qs(org_items)

    expr = {
        "$eq": [
            {"$toString": "$taxid"},
            {"$toString": "$$tid"},
        ]
    }
    if org_match:
        inner_match = {"$and": [{"$expr": expr}, org_match]}
    else:
        inner_match = {"$expr": expr}

    pipeline = []
    if sample_match:
        pipeline.append({"$match": sample_match})

    pipeline.extend(
        [
            {
                "$lookup": {
                    "from": org_coll.name,
                    "let": {"tid": "$taxid"},
                    "pipeline": [{"$match": inner_match}],
                    "as": "_org_hit",
                }
            },
            {"$match": {"_org_hit": {"$ne": []}}},
            {"$group": {"_id": "$coordinates", "taxids": {"$addToSet": "$taxid"}}},
            {
                "$project": {
                    "_id": 0,
                    "coord": "$_id",
                    "taxids": "$taxids",
                    "count": {"$size": "$taxids"},
                }
            },
        ]
    )

    out = []
    for doc in sc_coll.aggregate(pipeline, allowDiskUse=True):
        coord = doc.get("coord")
        count = doc.get("count", 0)
        raw_taxids = doc.get("taxids") or []
        taxids = [
            str(t).strip()
            for t in raw_taxids
            if t is not None and str(t).strip()
        ]
        if isinstance(coord, dict) and coord.get("type") == "Point":
            coords = coord.get("coordinates")
        elif isinstance(coord, (list, tuple)) and len(coord) >= 2:
            coords = list(coord)
        else:
            continue
        if not coords or len(coords) < 2:
            continue
        row = {"coordinates": coords, "count": int(count)}
        if taxids:
            row["taxids"] = taxids
        out.append(row)

    return out


def get_unique_sample_locations(args):
    return _aggregate_unique_locations(args)


def post_unique_sample_locations(data):
    return _aggregate_unique_locations(data)


def get_locations_from_coordinates(coords):
    lat, lng = coords.split('_')
    locations = SampleCoordinates.objects(coordinates__geo_intersects=[float(lng),float(lat)]).exclude('id')
    return list(locations.as_pymongo())

def lookup_related_data(data):
    query = geolocation.create_query(data)

    coords_query = SampleCoordinates.objects(query)
    counts = dict()
    accessions = coords_query.distinct('sample_accession')
    taxids = coords_query.distinct('taxid')
    for model in MODELS:
        config = MODEL_MAP.get(model)
        if model == 'organisms':
            counts[model] = config['count_query'](taxids)
        else:
            counts[model] = config['count_query'](accessions)
    return response_helper.dump_json(counts)

def _model_config_or_400(model):
    if model not in MODELS:
        raise BadRequest(
            description=f"'{model}' is not a valid model. Choose one of: {', '.join(MODELS)}"
        )
    config = MODEL_MAP.get(model)
    if not config:
        raise BadRequest(description=f"No configuration available for model '{model}'.")
    return config


def _related_data_for_filter(filter_args, model, format):
    query = geolocation.create_query(filter_args)
    coords_query = SampleCoordinates.objects(query)
    config = _model_config_or_400(model)
    field = config["field"]
    ids = coords_query.distinct(field)
    limit, offset = response_helper.get_pagination(filter_args)
    items = config["queryset"](ids)
    return response_helper.generate_response(format, config["fields"], items, limit, offset)


def get_related_model_data(data, model, format="json"):
    return _related_data_for_filter(data, model, format)


def get_related_data(data, format="tsv"):
    return _related_data_for_filter(data, data.get("model"), format)