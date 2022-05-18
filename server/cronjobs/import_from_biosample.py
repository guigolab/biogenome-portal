from db.models import SecondaryOrganism,Experiment
from utils import ena_client,utils,constants
from services import organisms_service,geo_loc_service
from datetime import datetime

def import_from_EBI_biosamples(PROJECTS):
    print('STARTING IMPORT BIOSAMPLES JOB')
    sample_dict = collect_samples(PROJECTS) ##return dict with project names as keys
    existing_samples = SecondaryOrganism.objects.scalar('accession')
    for project in sample_dict.keys():
        for sample in sample_dict[project]:
            if sample['accession'] in existing_samples:
                continue
            taxid = str(sample['taxId'])
            characteristics = utils.parse_sample_metadata(sample['characteristics'])
            organism = organisms_service.get_or_create_organism(taxid)
            if not organism:
                print('TAXID NOT FOUND:',taxid)
                print('SKIPPING SAMPLE CREATION')
                continue
            characteristics['scientificName'] = organism.organism #overwrite or create scientificName
            required_attr=dict(accession=sample['accession'],taxid=taxid)
            sample_obj = SecondaryOrganism(**required_attr,**characteristics)
            ##link with bioproject
            if project in constants.BIOPROJECTS_MAPPER.keys():
                project_accession = constants.BIOPROJECTS_MAPPER[project]
                sample_obj.bioprojects.append(constants.BIOPROJECTS_MAPPER[project])
                if not project_accession in organism.bioprojects:
                    organism.bioprojects.append(project_accession)
            ##get experiments
            experiments = ena_client.get_reads(sample_obj.accession)
            for exp in experiments:
                if Experiment.objects(experiment_accession=exp['experiment_accession']).first():
                    continue ##ena sometimes returns duplicates
                exp_obj = Experiment(**exp).save()
                organism.experiments.append(exp_obj)
                sample_obj.experiments.append(exp_obj)
            sample_obj.last_check = datetime.utcnow()
            ## we rely on the NCBI job to retrieve assemblies
            sample_obj.save()
            geo_loc_service.get_or_create_coordinates(sample_obj)
            if not sample_obj.sample_derived_from:
                organism.insdc_samples.append(sample_obj)
            organism.save()
    print('APPENDING SPECIMENS')
    ##append specimens as a backup if biosamples api fails
    append_specimens()
    print('DATA FROM ENA/BIOSAMPLES IMPORTED')

def collect_samples(PROJECTS):
    samples = dict()
    for project in PROJECTS:
        biosamples = ena_client.get_biosamples(project)
        print('lenght ebi biosamples', len(biosamples))
        if biosamples:
            samples[project] = biosamples
    return samples

def append_specimens():
    specimens = SecondaryOrganism.objects(sample_derived_from__ne=None)
    containers = SecondaryOrganism.objects(accession__in=[rec.sample_derived_from for rec in specimens])
    for container in containers:
        new_specimens = [spec for spec in specimens \
            if spec.sample_derived_from == container.accession and \
                not spec.accession in [spec.fetch().accession for spec in container.specimens]]
            # new_specimens = list(set(sample_specimens)-set([spec.fetch() for spec in sample_container.specimens]))
        container.modify(push_all__specimens=new_specimens)



    


