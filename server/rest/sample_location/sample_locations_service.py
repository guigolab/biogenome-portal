from db.models import SampleCoordinates,Organism,Experiment,BioSample,Assembly,GenomeAnnotation,LocalSample
from helpers import geolocation, data as data_helper
from werkzeug.exceptions import BadRequest

MODELS = ['organisms', 'biosamples', 'experiments', 'assemblies', 'local_samples', 'annotations']

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
    'experiments': {
        'field': 'sample_accession',
        'queryset': lambda ids: Experiment.objects(sample_accession__in=ids),
        'count_query': lambda ids: Experiment.objects(sample_accession__in=ids).count(),
        'fields': ['experiment_accession', 'sample_accession', 'taxid', 'scientific_name']
    },
    'annotations': {
        'field': 'sample_accession',
        'queryset': lambda ids: GenomeAnnotation.objects(assembly_accession__in=Assembly.objects(sample_accession__in=ids).only('accession').scalar('accession')),
        'count_query': lambda ids: GenomeAnnotation.objects(assembly_accession__in=Assembly.objects(sample_accession__in=ids).only('accession').scalar('accession')).count(),
        'fields': ['name', 'assembly_accession', 'assembly_name', 'taxid', 'scientific_name', 'gff_gz_location', 'tab_index_location']
    }
}

def get_sample_locations(args):
    offset = int(args.get('offset', 0))
    limit = int(args.get('limit', 20))
    query = geolocation.create_query(args)
    coords = SampleCoordinates.objects(query).exclude('id').skip(offset).limit(limit) 
    total = coords.count()
    response = dict(total=total, data=list(coords.as_pymongo()))
    return response

"""
filter by taxonomic parent and polygon coordinates
"""
def post_sample_locations(data):
    offset = int(data.get('offset', 0))
    limit = int(data.get('limit', 20))
    query = geolocation.create_query(data)
    try:
        locations = SampleCoordinates.objects(query).exclude('id').skip(offset).limit(limit) 
        total = locations.count()
        return dict(total=total, data=list(locations.as_pymongo()))
    
    except Exception as e:
        print(e)
        raise BadRequest(description=e)

def get_unique_sample_locations(args):

    query = geolocation.create_query(args)

    coords = SampleCoordinates.objects(query).exclude('id')

    pipeline = [
        {"$group": {
            "_id": "$coordinates",  # Group by unique coordinates
            "count": {"$sum": 1},
            "images": {"$push": "$image"}     # Count the occurrences of each coordinate set
        }},     # Count the number of unique coordinates
    ]

    response = [dict(coordinates=doc['_id']['coordinates'], count=doc['count'], images=doc['images']) for doc in coords.aggregate(pipeline)]
    
    return response


def post_unique_sample_locations(data):

    query = geolocation.create_query(data)

    coords = SampleCoordinates.objects(query).exclude('id')

    pipeline = [
        {"$group": {
            "_id": "$coordinates",  # Group by unique coordinates
            "count": {"$sum": 1},
            "images": {"$push": "$image"}     # Count the occurrences of each coordinate set
        }},     # Count the number of unique coordinates
    ]

    response = [dict(coordinates=doc['_id']['coordinates'], count=doc['count'], images=doc['images']) for doc in coords.aggregate(pipeline)]
    
    return response


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
    return data_helper.dump_json(counts)    

def get_related_model_data(data, model, format='json'):
    query = geolocation.create_query(data)
    coords_query = SampleCoordinates.objects(query)
    if model not in MODELS:
        raise BadRequest(description=f"'{model}' is not a valid model. Choose one of: {', '.join(MODELS)}")
    config = MODEL_MAP.get(model)
    if not config:
        raise BadRequest(description=f"No configuration available for model '{model}'.")
    field = config['field'] 
    ids = coords_query.distinct(field)
    limit, offset = data_helper.get_pagination(data)
    items = config['queryset'](ids)
    return data_helper.generate_response(format, config['fields'], items, limit, offset)

def get_related_data(data, format='tsv'):
    query = geolocation.create_query(data)

    model = data.get('model')

    if model not in MODELS:
        raise BadRequest(description=f"'{model}' is not a valid model. Choose one of: {', '.join(MODELS)}")

    coords_query = SampleCoordinates.objects(query)

    config = MODEL_MAP.get(model)

    if not config:
        raise BadRequest(description=f"No configuration available for model '{model}'.")

    field = config['field']
    ids = coords_query.distinct(field)  # Efficient way to extract just the values
    items = config['queryset'](ids)
    limit, offset = data_helper.get_pagination(data)
    return data_helper.generate_response(format, config['fields'], items, limit, offset)