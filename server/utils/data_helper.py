from db.models import Assembly
from . import ena_client
from services import assembly,biosample, organism,geo_localization,bioproject,reads


def create_data_from_assembly(assembly_obj, ncbi_response):
    organism_obj = organism.get_or_create_organism(assembly_obj.taxid)
    print(assembly_obj.to_json())
    if 'biosample' in ncbi_response.keys() and 'attributes' in ncbi_response['biosample'].keys():
        biosample_obj = biosample.create_biosample_from_ncbi_data(assembly_obj.sample_accession,ncbi_response,organism_obj)
    else:
        biosample_obj = biosample.create_biosample_from_accession(assembly_obj.sample_accession)
    
    if assembly_obj.sample_accession and biosample_obj:
        organism_obj.modify(add_to_set__biosamples=biosample_obj.accession)
        biosamples_to_update = [biosample_obj]
        children_samples = biosample.get_biosamples_derived_from(biosample_obj.accession)
        if children_samples:
            print(children_samples)
            biosamples_to_update.extend(children_samples)
        for saved_biosample in biosamples_to_update:
            geo_localization.create_coordinates(saved_biosample, organism_obj)
            saved_reads = reads.create_reads_from_accession(saved_biosample.accession)
            for read in saved_reads:
                organism_obj.modify(add_to_set__experiments=read)
                saved_biosample.modify(add_to_set__experiments=read)
            bioproject.create_bioprojects_from_NCBI(ncbi_response['bioproject_lineages'],organism_obj, saved_biosample)
            if 'sample derived from' in saved_biosample.metadata.keys():
                biosample_obj.modify(add_to_set__sub_samples=saved_biosample.accession)
        biosample_obj.modify(add_to_set__assemblies=assembly_obj.accession)
    else:
        bioproject.create_bioprojects_from_NCBI(ncbi_response['bioproject_lineages'],organism_obj)   
    organism_obj.modify(add_to_set__assemblies=assembly_obj.accession)
    organism_obj.save()
    return organism_obj

    ##ass

# get assembly
#  get organism and biosample
#   
#   get reads
##
##
##
##
# assemblies are not managed here

def create_data_from_biosample(biosample_obj):
    biosamples_to_update=[biosample_obj]
    organism_obj = organism.get_or_create_organism(biosample_obj.taxid)

    if 'sample derived from' in biosample_obj.metadata.keys():
        biosample_container = biosample.create_biosample_from_accession(biosample_obj.metadata['sample derived from'])
        biosample_container.modify(add_to_set__sub_samples=biosample_obj.accession)
        organism_obj.modify(add_to_set__biosamples=biosample_container.accession)
        biosamples_to_update.append(biosample_container)
    else:
        organism_obj.modify(add_to_set__biosamples=biosample_obj.accession)
        children_samples = biosample.get_biosamples_derived_from(biosample_obj.accession)
        if children_samples:
            biosamples_to_update.extend(children_samples)
        response = ena_client.parse_assemblies(biosample_obj.accession)
        if response:
            for ass in response:
                assembly.create_assembly_from_accession(ass['accession'])
        ##check for assembly
    for saved_biosample in biosamples_to_update:
        geo_localization.create_coordinates(saved_biosample, organism_obj)
        saved_reads = reads.create_reads_from_accession(saved_biosample.accession)
        for read in saved_reads:
            organism_obj.modify(add_to_set__experiments=read)
            saved_biosample.modify(add_to_set__experiments=read)
        
    organism_obj.save()
    return organism_obj

def create_data_from_annotation(annotation_obj):
    assembly_obj = Assembly.objects(accession=annotation_obj.assembly_accession).first()
    if not assembly_obj:
        assembly_obj = assembly.create_assembly_from_accession(annotation_obj.assembly_accession)
    organism_obj = organism.get_or_create_organism(annotation_obj.taxid)
    organism_obj.modify(add_to_set__annotations=annotation_obj.name)
    organism_obj.save()