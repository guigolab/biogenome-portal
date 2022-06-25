from utils import ena_client,utils
from services import taxon_service
from flask import current_app as app
from flask import json
from mongoengine.queryset.visitor import Q
from db.models import Organism,TaxonNode
import os 

ROOT_NODE=os.getenv('ROOT_NODE')
PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')

def get_organisms(offset=0, limit=20, 
                sort_order=None, sort_column=None,
                parent_taxid=ROOT_NODE, filter=None, 
                filter_option=None, bioproject=None,
                coordinates=None,geo_location=None,
                biosamples=None,local_samples=None,
                assemblies=None,experiments=None,
                annotations=None):
    query=dict()
    json_resp=dict()
    stats=dict()    
    filter_query = get_query_filter(filter, filter_option) if filter else None
    get_coordinates_filter(query,coordinates,geo_location)
    get_data_query(query, biosamples, local_samples, assemblies, annotations, experiments)
    taxa = TaxonNode.objects(taxid=parent_taxid).first()
    query['taxon_lineage'] = taxa.taxid
    if bioproject and bioproject != PROJECT_ACCESSION:
        query['bioprojects'] = bioproject
    organisms = Organism.objects(filter_query, **query).exclude('id') if filter_query else Organism.objects.filter(**query).exclude('id')
    if sort_column:
        sort = '-'+sort_column if sort_order == 'true' else sort_column
        organisms = organisms.order_by(sort)
    stats = get_stats(organisms)
    json_resp['total'] = organisms.count()
    json_resp['data'] = organisms[int(offset):int(offset)+int(limit)].as_pymongo()
    json_resp['stats'] = stats
    return json.dumps(json_resp)    



def get_stats(organisms):
    stats = dict()
    stats['biosamples'] = organisms.filter(biosamples__not__size=0).count()
    if os.getenv('LOCAL_MANAGEMENT'):
        stats['local_samples'] = organisms.filter(local_samples__not__size=0).count()
    stats['assemblies'] = organisms.filter(assemblies__not__size=0).count()
    stats['experiments'] = organisms.filter(experiments__not__size=0).count()
    stats['annotations'] = organisms.filter(annotations__not__size=0).count()
    return stats


def get_query_filter(filter,option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'common_name':
        return (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter))
    elif option == 'tolid':
        return (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def get_data_query(query, biosamples, localSamples, assemblies, annotations, experiments):
    if biosamples:
        query['biosamples__not__size'] = 0
    if localSamples:
        query['local_samples__not__size'] = 0
    if assemblies:
        query['assemblies__not__size'] = 0
    if annotations:
        query['annotations__not__size'] = 0
    if experiments:
        query['experiments__not__size'] = 0



def get_coordinates_filter(query, only_coordinates, geo_location):
    if geo_location:
        query['coordinates'] = geo_location
    elif only_coordinates == 'true':
        query['coordinates__not__size'] = 0

def get_or_create_organism(taxid, common_names=None):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
        taxon_xml = ena_client.get_taxon_from_ena(taxid)
        if not taxon_xml:
            ##TODO add call to NCBI
            print('TAXID NOT FOUND')
            print(taxid)
            return
        lineage = utils.parse_taxon(taxon_xml)
        tax_organism = lineage[0]
        tolid = ena_client.get_tolid(taxid)
        taxon_lineage = taxon_service.create_taxons_from_lineage(lineage)
        taxon_list = [tax.taxid for tax in taxon_lineage]
        insdc_common_name = tax_organism['commonName'] if 'commonName' in tax_organism.keys() else ''
        organism = Organism(taxid = taxid, insdc_common_name=insdc_common_name, scientific_name= tax_organism['scientificName'], taxon_lineage = taxon_list, tolid_prefix=tolid).save()
        taxon_service.leaves_counter(taxon_lineage)
    if common_names and len(common_names.split('|')) > 0:
        names_arr = common_names.split('|')
        if len(organism.common_name) > 0:
            names_arr = [name for name in names_arr if name not in organism.common_name]
        organism.modify(push_all__common_name=names_arr)
    return organism

# def update_organism_names(names):

# def delete_organisms(taxids):
#     organisms_to_delete = Organism.objects(taxid__in=taxids)
#     app.logger.info(organisms_to_delete.to_json())
#     deleted_organisms=list()
#     for organism in organisms_to_delete:
#         app.logger.info(organism.organism)
#         tax_lineage = organism.taxon_lineage
#         SecondaryOrganism.objects(taxid=organism.taxid).delete()
#         if len(organism.experiments)>0:
#             Experiment.objects(id__in=[exp.id for exp in organism.experiments]).delete()
#         if len(organism.assemblies)>0:
#             Assembly.objects(id__in=[ass.id for ass in organism.assemblies]).delete()
#         if organism.image:
#             organism.image.delete()
#         name = organism.organism
#         organism.delete()
#         taxon_service.delete_taxons(tax_lineage)
#         deleted_organisms.append(name)
#     return deleted_organisms
