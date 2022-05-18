import requests
import time
from utils import ena_client,utils
from services import organisms_service,geo_loc_service, bioproject_service,annotations_service
from db.models import Assembly, Experiment,SecondaryOrganism
from datetime import datetime

def import_from_NCBI(project_accession):
    assemblies = get_assemblies(project_accession)
    existing_assembly_accessions=Assembly.objects.scalar('accession')
    for ass in assemblies:
        if ass['assembly_accession'] in existing_assembly_accessions:
            continue
        sample_accession=ass['biosample_accession']
        ass_obj = Assembly(accession = ass['assembly_accession'],assembly_name= ass['display_name'], sample_accession= sample_accession).save()
        organism = organisms_service.get_or_create_organism(str(ass['org']['tax_id']))
        sample_obj = SecondaryOrganism.objects(accession=sample_accession).first()
        ##parse sample
        if not sample_obj:
            required_metadata=dict(accession=sample_accession,taxid=organism.taxid,scientificName=organism.organism)
            sample_obj = SecondaryOrganism(**handle_biosample(ass,required_metadata))
            ##save coordinates
        organism.assemblies.append(ass_obj)
        sample_obj.assemblies.append(ass_obj)
        #get reads
        experiments = ena_client.get_reads(sample_obj.accession)
        for exp in experiments:
            if Experiment.objects(experiment_accession=exp['experiment_accession']).first():
                continue
            exp_obj = Experiment(**exp).save()
            organism.experiments.append(exp_obj)
            sample_obj.experiments.append(exp_obj)
        sample_obj.last_check = datetime.utcnow()
        #get bioproject lineage
        bioproject_accessions = [bioproject.accession for bioproject in bioproject_service.create_bioprojects_from_NCBI(ass['bioproject_lineages']) if bioproject.accession != project_accession]
        for b_acc in bioproject_accessions:
            if not b_acc in organism.bioprojects:
                organism.bioprojects.append(b_acc)
            if not b_acc in sample_obj.bioprojects:
                sample_obj.bioprojects.append(b_acc)
        #get annotations
        annotation = annotations_service.parse_annotation(organism,ass_obj)
        if annotation:
            organism.annotations.append(annotation)
            print(organism.annotations)
        sample_obj.save()
        geo_loc_service.get_or_create_coordinates(sample_obj)
        if not sample_obj.id in organism.insdc_samples:
            organism.insdc_samples.append(sample_obj)
        organism.save()
    print('ASSEMBLIES FROM NCBI IMPORTED')

def handle_biosample(assembly, required_metadata):
    extra_metadata=dict()
    if not 'biosample' in assembly.keys() or not 'attributes' in assembly['biosample'].keys():
        #retrieve sample metadata from EBI/BioSamples
        resp = ena_client.get_sample_from_biosamples(required_metadata['accession'])
        extra_metadata = resp['_embedded']['samples'][0]['characteristics'] if '_embedded' in resp.keys() else dict()
    else:
        biosample_metadata = assembly['biosample']
        for attr in biosample_metadata['attributes']:
            extra_metadata[attr['name']] = [dict(text=attr['value'])]
    return {**required_metadata, **utils.parse_sample_metadata(extra_metadata)}

##retrieve assemblies by bioproject in NCBI
def get_assemblies(project_accession):
    assemblies=list()
    result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&filters.has_annotation=false&&page_size=100").json()
    counter = 1
    if 'assemblies' in result.keys():
        while 'next_page_token' in result.keys():
            assemblies.extend([ass['assembly'] for ass in result['assemblies']])
            next_page_token = result['next_page_token']
            #max 3 requests per second without auth token
            if counter >= 3:
                time.sleep(1)
                counter = 0
            result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&filters.has_annotation=false&&page_size=1000&page_token={next_page_token}").json()
            counter+=1
        if 'assemblies' in result.keys():
            assemblies.extend([ass['assembly'] for ass in result['assemblies']])
    return assemblies

