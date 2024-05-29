from db.models import Organism,SampleCoordinates
from errors import NotFound

CHUNK_LIMIT=5000

def get_sample_locations_by_taxon(taxid):
        related_organisms_by_taxid = Organism.objects(taxon_lineage=taxid).scalar('taxid')
        if not related_organisms_by_taxid:
            raise NotFound
        chunks = [related_organisms_by_taxid[i:i+CHUNK_LIMIT] for i in range(0, len(related_organisms_by_taxid), CHUNK_LIMIT)] if len(related_organisms_by_taxid) > CHUNK_LIMIT else [related_organisms_by_taxid]
        sample_coordinates=[]
        for chunk in chunks:
            sample_coordinates.extend(SampleCoordinates.objects(taxid__in=chunk).exclude('id').as_pymongo())
        return sample_coordinates

def get_sample_locations_by_organism(taxid):
    if not Organism.objects(taxid=taxid).first():
        raise NotFound
    sample_coordinates = SampleCoordinates.objects(taxid=taxid)
    return sample_coordinates

def get_sample_locations_by_biosample(accession):
    sample_coordinates = SampleCoordinates.objects(sample_accession=accession).first()
    if not sample_coordinates:
         raise NotFound
    return sample_coordinates

def get_sample_locations_by_localsample(local_id):
    sample_coordinates = SampleCoordinates.objects(sample_accession=local_id).first()
    if not sample_coordinates:
         raise NotFound
    return sample_coordinates
    