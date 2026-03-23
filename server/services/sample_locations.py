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

_UNIQUE_LOCATIONS_PIPELINE = [
    {
        "$group": {
            "_id": "$coordinates",
            "count": {"$sum": 1},
            "images": {"$push": "$image"},
        }
    },
]

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


def _aggregate_unique_locations(filter_args):
    query = geolocation.create_query(filter_args)
    coords = SampleCoordinates.objects(query).exclude("id")
    return [
        dict(
            coordinates=doc["_id"]["coordinates"],
            count=doc["count"],
            images=doc["images"],
        )
        for doc in coords.aggregate(_UNIQUE_LOCATIONS_PIPELINE)
    ]


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