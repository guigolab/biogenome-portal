from db.models import SampleCoordinates
from mongoengine.queryset.visitor import Q

def get_sample_locations(offset=0, limit=10000, lineage=None, sample_type=None, sample_accession=None, taxid=None, filter=None):
    offset = int(offset)
    limit = int(limit)

    query = Q()

    if sample_accession:
        query &= Q(sample_accession=sample_accession)
    
    if taxid:
        query &= Q(taxid=str(taxid))
    
    if lineage:
        query &= Q(lineage=str(lineage))

    if sample_type:
        if sample_type in ['local_sample', 'biosample']:
            query &= Q(is_local_sample=(sample_type == 'local_sample'))
    
    # Apply filtering if needed
    if filter:
        filter_query = Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter)
        query &= filter_query

    coords = SampleCoordinates.objects(query).exclude('id').skip(offset).limit(limit)
    total = coords.count()
    response = dict(total=total, data=list(coords.as_pymongo()))
    return response

def get_sample_locations_by_taxon(taxid):
    return SampleCoordinates.objects(lineage=taxid).exclude('id').to_json()

def get_sample_locations_by_organism(taxid):
    return SampleCoordinates.objects(taxid=taxid).exclude('id').to_json()

def get_sample_locations_by_biosample(accession):
    return SampleCoordinates.objects(sample_accession=accession).exclude('id').first().to_json()

def get_sample_locations_by_localsample(local_id):
    return SampleCoordinates.objects(sample_accession=local_id).exclude('id').first()
    