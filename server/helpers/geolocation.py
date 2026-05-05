from mongoengine.queryset.visitor import Q

from db.model import SampleCoordinates

def add_image(taxid, image):
    coordinates = SampleCoordinates.objects(taxid=taxid)
    if len(coordinates) > 0:
        SampleCoordinates.objects(taxid=taxid).update(image=image)


def create_query(data):
    query = Q()
    polygon = data.get("polygon")
    if polygon:
        query &= Q(coordinates__geo_within=polygon)

    sample_type = data.get("sample_type")
    if sample_type and sample_type in ["local_sample", "biosample"]:
        query &= Q(is_local_sample=(sample_type == "local_sample"))

    sample_accession = data.get("sample_accession")
    if sample_accession:
        query &= Q(sample_accession=sample_accession)

    taxid = data.get("taxid")
    if taxid:
        query &= Q(lineage=str(taxid))

    filter = data.get("filter")
    if filter:
        filter_query = (
            Q(scientific_name__iexact=filter)
            | Q(scientific_name__icontains=filter)
            | Q(sample_accession__iexact=filter)
            | Q(sample_accession__icontains=filter)
        )
        query &= filter_query

    return query
