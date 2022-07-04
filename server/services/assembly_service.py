from pickletools import read_uint1
from db.models import Assembly, BioSample,Chromosome,AssemblyTrack, Organism
from mongoengine.queryset.visitor import Q
import json
from flask import current_app as app
from services import organisms_service,biosample_service,experiment_service,geo_localization_service,bioproject_service,annotations_service
from utils.ncbi_client import get_assembly

def create_assembly(assembly, organism, sample=None,auto_imported=True):
    ass_metadata=dict()
    for key in assembly.keys():
        if key not in ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']:
            ass_metadata[key] = assembly[key]
    if sample:
        ass_obj = Assembly(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=organism.scientific_name, sample_accession= sample.accession,metadata=ass_metadata,taxid=organism.taxid,auto_imported=auto_imported).save()
        sample.modify(add_to_set__assemblies=ass_obj.accession)
    else:
        ass_obj = Assembly(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=organism.scientific_name,metadata=ass_metadata,taxid=organism.taxid,auto_imported=auto_imported).save()
    organism.modify(add_to_set__assemblies=ass_obj.accession)
    return ass_obj



def create_or_update_assembly_from_data(data,accession):
    if not accession:
        return 
    assembly_obj = Assembly.objects(accession=accession).first()
    is_created = False
    if not assembly_obj:
        is_created = True
        ass_to_save = get_assembly(accession)['assemblies'][0]['assembly']
        organism = organisms_service.get_or_create_organism(str(ass_to_save['org']['tax_id']))
        if 'biosample_accession' in ass_to_save.keys():
            sample_accession=ass_to_save['biosample_accession']
            sample_obj = biosample_service.get_or_create_biosample(sample_accession,organism,ass_to_save)
            assembly_obj = create_assembly(ass_to_save,organism,sample_obj,auto_imported=False)
            geo_localization_service.get_or_create_coordinates(sample_obj,organism)
            experiment_service.create_experiments(sample_obj,organism)
            bioproject_service.create_bioprojects_from_NCBI(ass_to_save['bioproject_lineages'],organism, sample_obj)
        else:
            assembly_obj = create_assembly(ass_to_save,organism,auto_imported=False)
            bioproject_service.create_bioprojects_from_NCBI(ass_to_save['bioproject_lineages'],organism)    
        if 'chromosomes' in ass_to_save.keys():
            create_chromosomes(assembly_obj, ass_to_save['chromosomes'])

        ## how to manage annotations for manually imported assemblies??
        # annotations_service.parse_annotation(organism,assembly_obj)
        ##trigger status update
        organism.save()
    if data.keys():
        assembly_track = AssemblyTrack(**data)
        assembly_obj.track = assembly_track
        assembly_obj.save()
    if is_created:
        msg = f"{assembly_obj.accession} succesfully created"
    else:
        msg = f"{assembly_obj.accession} succesfully updated"
    return dict(msg=msg)

def create_chromosomes(assembly,chromosomes):
    for chr in chromosomes:
        if not 'accession_version' in chr.keys():
            continue
        chr_obj = Chromosome.objects(accession_version = chr['accession_version']).first()
        if not chr_obj:
            metadata=dict()
            for k in chr.keys():
                if k != 'accession_version':
                    metadata[k] = chr[k]
            chr_obj = Chromosome(accession_version=chr['accession_version'], metadata=metadata).save()
        assembly.modify(add_to_set__chromosomes=chr_obj.accession_version)

def query_search(offset=0, limit=20, filter=None):
    json_resp=dict()
    if filter:
        assemblies = Assembly.objects(get_query_filter(filter)).exclude('id','created')
    else:
        assemblies = Assembly.objects().exclude('id','created')
    app.logger.info(assemblies.as_pymongo())
    json_resp['total'] = assemblies.count()
    app.logger.info(type(json_resp['total']))
    json_resp['data'] = list(assemblies[int(offset):int(offset)+int(limit)].as_pymongo())
    app.logger.info(type(json_resp['data']))

    app.logger.info(json_resp)
    return json.dumps(json_resp)  

def get_query_filter(filter):
    return (Q(accession__iexact=filter) | Q(accession__icontains=filter) | Q(assembly_name__icontains=filter) | Q(assembly_name__iexact=filter) | Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def delete_assembly(accession):
    assebly_to_delete = Assembly.objects(accession=accession).first()
    if not assebly_to_delete:
        return
    sample_to_update = BioSample.objects(assemblies=accession).first()
    if sample_to_update:
        sample_to_update.modify(pull_assemblies=accession)
    #trigger eventual status change in organism
    organism_to_update = Organism.objects(assemblies=accession).first()
    if organism_to_update:
        organism_to_update.modify(pull_assemblies=accession)
        organism_to_update.save()
    return accession


def create_data_from_assembly_accession(accession, auto_imported=True):
    ass_to_save = get_assembly(accession)
    if not ass_to_save:
        return dict(msg="Assembly not found in NCBI",success=False,id=accession)
    organism = organisms_service.get_or_create_organism(str(ass_to_save['org']['tax_id']))
    if 'biosample_accession' in ass_to_save.keys():
        sample_accession=ass_to_save['biosample_accession']
        sample_obj = biosample_service.get_or_create_biosample(sample_accession,organism,ass_to_save)
        assembly_obj = create_assembly(ass_to_save,organism,sample_obj,auto_imported=auto_imported)
        geo_localization_service.get_or_create_coordinates(sample_obj,organism)
        experiment_service.create_experiments(sample_obj,organism)
        bioproject_service.create_bioprojects_from_NCBI(ass_to_save['bioproject_lineages'],organism, sample_obj)
    else:
        assembly_obj = create_assembly(ass_to_save,organism,auto_imported=auto_imported)
        bioproject_service.create_bioprojects_from_NCBI(ass_to_save['bioproject_lineages'],organism)    
    if 'chromosomes' in ass_to_save.keys():
        create_chromosomes(assembly_obj, ass_to_save['chromosomes'])
    organism.save()
    return dict(msg="Assembly created",success=True,id=accession)
 
