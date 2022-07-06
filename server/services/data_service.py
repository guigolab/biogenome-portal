from db.models import Assembly, BioProject, Experiment, GeoCoordinates, LocalSample,BioSample,Annotation, TaxonNode
from utils import common_functions
from services import organisms_service,biosample_service,experiment_service,geo_localization_service,bioproject_service,assembly_service
from utils import ncbi_client,ena_client

DB_MODEL_MAPPER={
 'assemblies': Assembly,
 'experiments':Experiment,
 'local_samples':LocalSample,
 'biosamples':BioSample,
 'annotations':Annotation,
}

def get_data(model, taxid=None):
    if taxid:
        return DB_MODEL_MAPPER[model].objects(taxid=taxid).exclude('id','created').to_json()
    else:
        return DB_MODEL_MAPPER[model].objects().exclude('id','created').to_json()

def create_data_from_assembly(assembly_accession):
    assembly_to_save = ncbi_client.get_assembly(assembly_accession)
    if not assembly_to_save:
        return
    organism = organisms_service.get_or_create_organism(str(assembly_to_save['org']['taxid']))
    if 'biosample_accession' in assembly_to_save.keys():
        sample_accession=assembly_to_save['biosample_accession']
        sample_obj = biosample_service.get_or_create_biosample(sample_accession,organism,assembly_to_save)
        assembly_obj = assembly_service.create_assembly(assembly_to_save,organism,sample_obj)
        geo_localization_service.get_or_create_coordinates(sample_obj,organism)
        experiment_service.create_experiments(sample_obj,organism)
        bioproject_service.create_bioprojects_from_NCBI(assembly_to_save['bioproject_lineages'],organism, sample_obj)
    else:
        assembly_obj = assembly_service.create_assembly(assembly_to_save,organism)
        bioproject_service.create_bioprojects_from_NCBI(assembly_to_save['bioproject_lineages'],organism)    
    if 'chromosomes' in assembly_to_save.keys():
        assembly_service.create_chromosomes(assembly_obj, assembly_to_save['chromosomes'])
    organism.save()
    return assembly_obj


def create_data_from_biosample(biosample_accession):
    ## if assembly is present trigger creation from assembly
    biosample_obj = biosample_service.create_biosample_from_biosamples(biosample_accession)
    if not biosample_obj:
        return
    if 'sample derived from' in biosample_obj.metadata.keys():
        biosample_container_obj = biosample_service.create_biosample_from_biosamples(biosample_obj.metadata['sample derived from'])
        if biosample_container_obj:
            assembly_data = ena_client.parse_assemblies(biosample_container_obj.accession)
            
            
    # parse and save biosample
    # check for children or for parent
    # trigger same method for each children or parent
    # check reads
    # check assemblies
    # create coordinates
    # create assemblies
    # create reads
    #

    biosample_response = ena_client.get_sample_from_biosamples(accession)
    sample_to_save = common_functions.biosamples_response_parser(biosample_response)
    organism = organisms_service.get_or_create_organism(sample_to_save['taxId'])
    if not sample_to_save:
        return
    sample_derived_from = list()
    saved_sample = biosample_service.create_biosample_from_biosamples(sample_to_save,organism,sample_derived_from)
    #get sample container
    if sample_derived_from:
        for sub_sample in sample_derived_from:
            create_data_from_biosample(sub_sample.accession)
            resp = ena_client.get_sample_from_biosamples(sub_sample.accession)
            sample_container = common_functions.biosamples_response_parser(resp)
            if sample_container:
               biosample_service.create_biosample_from_biosamples(sample_container,organism,list())
