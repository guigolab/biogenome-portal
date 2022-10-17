from services import assembly_service, bioproject_service, biosample_service, geo_localization_service, organism_service
from . import ena_client
from services import read_service
import os 

PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p] if os.getenv('PROJECTS') else None

def create_data_from_assembly(assembly_obj, ncbi_response):
    organism_obj = organism_service.get_or_create_organism(assembly_obj.taxid)
    if 'biosample' in ncbi_response.keys() and 'attributes' in ncbi_response['biosample'].keys():
        biosample_obj = biosample_service.create_biosample_from_ncbi_data(assembly_obj.sample_accession,ncbi_response,organism_obj)
    else:
        print('CREATING BIOSAMPLE FROM ACCESSION')
        print(assembly_obj.to_json())
        biosample_obj = biosample_service.create_biosample_from_accession(assembly_obj.sample_accession)
    if assembly_obj.sample_accession and biosample_obj:
        organism_obj.modify(add_to_set__biosamples=biosample_obj.accession)
        biosamples_to_update = [biosample_obj]
        children_samples = biosample_service.get_biosamples_derived_from(biosample_obj.accession)
        if children_samples:
            biosamples_to_update.extend(children_samples)
        for saved_biosample in biosamples_to_update:
            bioproject_service.create_bioprojects_from_NCBI(ncbi_response['bioproject_lineages'],organism_obj, saved_biosample)
            geo_localization_service.create_coordinates(saved_biosample, organism_obj)
            saved_reads = read_service.create_reads_from_biosample_accession(saved_biosample.accession)
            for read in saved_reads:
                organism_obj.modify(add_to_set__experiments=read)
                saved_biosample.modify(add_to_set__experiments=read)
            if 'sample derived from' in saved_biosample.metadata.keys():
                biosample_obj.modify(add_to_set__sub_samples=saved_biosample.accession)
        biosample_obj.modify(add_to_set__assemblies=assembly_obj.accession)
    else:
        bioproject_service.create_bioprojects_from_NCBI(ncbi_response['bioproject_lineages'],organism_obj)   
    organism_obj.modify(add_to_set__assemblies=assembly_obj.accession)
    organism_obj.save()
    return organism_obj

def create_data_from_biosample(biosample_obj):
    biosamples_to_update=[biosample_obj]
    organism_obj = organism_service.get_or_create_organism(biosample_obj.taxid)
    if not organism_obj:
        return
    organism_obj.modify(add_to_set__biosamples=biosample_obj.accession)
    if 'sample derived from' in biosample_obj.metadata.keys():
        biosample_container = biosample_service.create_biosample_from_accession(biosample_obj.metadata['sample derived from'])
        if biosample_container:
            biosample_container.modify(add_to_set__sub_samples=biosample_obj.accession)
            organism_obj.modify(add_to_set__biosamples=biosample_container.accession)
            biosamples_to_update.append(biosample_container)
    else:
        organism_obj.modify(add_to_set__biosamples=biosample_obj.accession)
        children_samples = biosample_service.get_biosamples_derived_from(biosample_obj.accession)
        if children_samples:
            for sample in children_samples:
                biosample_obj.modify(add_to_set__sub_samples=sample.accession)
            biosamples_to_update.extend(children_samples)
        response = ena_client.parse_assemblies(biosample_obj.accession)
        if response:
            for ass in response:
                assembly_accession = ass['accession']+'.'+ass['version']
                assembly_service.create_assembly_from_accession(assembly_accession)
        ##check for assembly
    for saved_biosample in biosamples_to_update:
        ##create bioproject if present
        if 'project name' in saved_biosample.metadata.keys() and PROJECTS:
            project_mapper = {p.split('_')[0]:p.split('_')[1] for p in PROJECTS}
            if saved_biosample.metadata['project name'] in project_mapper.keys():
                bioproject = bioproject_service.create_bioproject_from_ENA(project_mapper[saved_biosample.metadata['project name']])
                if bioproject:
                    organism_obj.modify(add_to_set__bioprojects=bioproject.accession)
                    saved_biosample.modify(add_to_set__bioprojects=bioproject.accession)
                    bioproject_service.leaves_counter([bioproject])
        geo_localization_service.create_coordinates(saved_biosample, organism_obj)
        saved_reads = read_service.create_reads_from_biosample_accession(saved_biosample.accession)
        for read in saved_reads:
            organism_obj.modify(add_to_set__experiments=read)
            saved_biosample.modify(add_to_set__experiments=read)
    
    organism_obj.save()
    return organism_obj

def create_data_from_annotation(annotation_obj):
    organism_obj = organism_service.get_or_create_organism(annotation_obj.taxid)
    organism_obj.modify(add_to_set__annotations=annotation_obj.name)
    organism_obj.save()

    