from db.models import BioSample
from utils import data_helper,ena_client
from services import biosample, bioproject, organism

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
            biosample_obj = biosample.create_biosample_from_ebi_data(sample)
            organism_obj = data_helper.create_data_from_biosample(biosample_obj)
            # biosample = biosample_service.create_biosample_from_biosamples(sample, organism, sub_samples)
            bioproject.create_bioproject_from_ENA(project_mapper[project])
            organism_obj.modify(add_to_set__bioprojects=project_mapper[project])
            biosample_obj.modify(add_to_set__bioprojects=project_mapper[project])
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
            organism_obj = organism.get_or_create_organism(sample.taxid)
            if not organism_obj:
                print('ORGANISM DOES NOT EXIST', sample.taxid)
                continue
            organism_obj.modify(add_to_set__biosamples=sample.accession)
            organism_obj.save()
        else:
            sample_container.modify(add_to_set__sub_samples=sample.accession)
    #get orphan specimens and append to organism



    


