from db.models import BioSample
from server.services import bioproject, geo_localization
from utils import ena_client
from services import organisms_service,biosample_service,experiment_service

def import_from_EBI_biosamples(PROJECTS):
    print('STARTING IMPORT BIOSAMPLES JOB')
    project_mapper = {p.split('_')[0]:p.split('_')[1] for p in PROJECTS}
    sample_dict = collect_samples(project_mapper.keys()) ##return dict with project names as keys
    existing_samples = BioSample.objects.scalar('accession')
    sub_samples = list()
    for project in sample_dict.keys():
        for sample in sample_dict[project]:
            if sample['accession'] in existing_samples:
                continue
            taxid = str(sample['taxId'])
            organism = organisms_service.get_or_create_organism(taxid)
            if not organism:
                print('TAXID NOT FOUND:',taxid)
                print('SKIPPING SAMPLE CREATION')
                continue
            biosample = biosample_service.create_biosample_from_biosamples(sample, organism, sub_samples)
            experiment_service.create_experiments(biosample,organism)
            bioproject.create_bioproject_from_ENA(project_mapper[project])
            organism.modify(add_to_set__bioprojects=project_mapper[project])
            biosample.modify(add_to_set__bioprojects=project_mapper[project])
            ##get experiments
            ## we rely on the NCBI job to retrieve assemblies
            geo_localization.get_or_create_coordinates(biosample,organism)
            ##trigger status update
            organism.save()
    print('APPENDING SPECIMENS')
    ##append specimens as a backup if biosamples api fails
    append_specimens(sub_samples)
    print('DATA FROM ENA/BIOSAMPLES IMPORTED')

def collect_samples(PROJECTS):
    samples = dict()
    for project in PROJECTS:
        biosamples = ena_client.get_biosamples(project)
        print('lenght ebi biosamples', len(biosamples))
        if biosamples:
            samples[project] = biosamples
    return samples

def append_specimens(sub_samples):
    for sample in sub_samples:
        sample_container = BioSample.objects(accession=sample.metadata['sample derived from']).first()
        if not sample_container:
            ##append orphans to organism
            organism = organisms_service.get_or_create_organism(sample.taxid)
            if not organism:
                print('ORGANISM DOES NOT EXIST', sample.taxid)
                continue
            organism.modify(add_to_set__biosamples=sample.accession)
        else:
            sample_container.modify(add_to_set__sub_samples=sample.accession)
    #get orphan specimens and append to organism



    


