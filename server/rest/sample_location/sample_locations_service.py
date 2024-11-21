from db.models import SampleCoordinates
from mongoengine.queryset.visitor import Q
from helpers import data as data_helper

def get_sample_locations(offset=0, limit=10000, sample_type=None, sample_accession=None, taxid=None, filter=None):
    offset = int(offset)
    limit = int(limit)

    query = Q()

    if sample_accession:
        query &= Q(sample_accession=sample_accession)
    
    if taxid:
        query &= Q(taxid=str(taxid))

    if sample_type and sample_type in ['local_sample', 'biosample']:
        query &= Q(is_local_sample=(sample_type == 'local_sample'))
    
    # Apply filtering if needed
    if filter:
        filter_query = Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter) | Q(sample_accession__iexact=filter) | Q(sample_accession__icontains=filter)
        query &= filter_query

    coords = SampleCoordinates.objects(query).exclude('id').skip(offset).limit(limit)
    total = coords.count()
    response = dict(total=total, data=list(coords.as_pymongo()))
    return response


def get_unique_sample_locations(taxid=None, sample_type=None, sample_accession=None, filter=None):

    query = Q()

    if sample_accession:
        query &= Q(sample_accession=sample_accession)
    
    if taxid:
        query &= Q(lineage=str(taxid))

    if sample_type and sample_type in ['local_sample', 'biosample']:
        query &= Q(is_local_sample=(sample_type == 'local_sample'))
    
    # Apply filtering if needed
    if filter:
        filter_query = Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter) | Q(sample_accession__iexact=filter) | Q(sample_accession__icontains=filter)
        query &= filter_query
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
    