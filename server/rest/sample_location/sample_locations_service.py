from db.models import Organism,SampleCoordinates,BioSample, LocalSample
from errors import NotFound


def get_sample_locations_by_taxon(taxid):
        related_organisms_by_taxid = Organism.objects(taxon_lineage=taxid).scalar('taxid')
        if not related_organisms_by_taxid:
            raise NotFound
        sample_coordinates = SampleCoordinates.objects(taxid__in=related_organisms_by_taxid).exclude('id')
        return sample_coordinates

def get_sample_locations_by_organism(taxid):
    if not Organism.objects(taxid=taxid).first():
        raise NotFound
    sample_coordinates = SampleCoordinates.objects(taxid=taxid)
    return sample_coordinates

def get_sample_locations_by_biosample(accession):
    if not BioSample.objects(accession=accession).first():
        raise NotFound
    sample_coordinates = SampleCoordinates.objects(sample_accession=accession).first()
    return sample_coordinates

def get_sample_locations_by_localsample(local_id):
    if not LocalSample.objects(local_id=local_id).first():
        raise NotFound
    sample_coordinates = SampleCoordinates.objects(sample_accession=local_id).first()
    return sample_coordinates
    