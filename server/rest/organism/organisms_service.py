from ..utils import ena_client,ncbi_client
from ..taxon import taxons_service
from ..taxonomy import taxonomy_service
from ..sample_location import sample_locations_service
from mongoengine.queryset.visitor import Q
from db.models import CommonName,TaxonNode, Organism, Publication,Assembly,GenomeAnnotation,BioSample,LocalSample,Experiment,BioGenomeUser
import os 
from lxml import etree
from errors import NotFound
from flask_jwt_extended import get_jwt


ROOT_NODE=os.getenv('ROOT_NODE')
PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')

MODEL_LIST = {
    'assemblies':{'model':Assembly, 'id':'accession'},
    'annotations':{'model':GenomeAnnotation, 'id':'name'},
    'biosamples':{'model':BioSample, 'id':'accession'},
    'local_samples':{'model':LocalSample, 'id':'local_id'},
    'experiments':{'model':Experiment, 'id':'experiment_accession'},
    }

def get_organisms(offset=0, limit=20, 
                sort_order=None, sort_column=None,
                filter=None, parent_taxid=None,
                filter_option='scientific_name', country=None,
                goat_status=None, insdc_status=None, target_list_status=None,
                user=None):
    query=dict()
    organisms = Organism.objects().exclude('id')
    if filter:
        filter_query = get_filter(filter, filter_option)
        organisms = organisms.filter(filter_query)
    if parent_taxid:
        query['taxon_lineage'] = parent_taxid
    if goat_status:
        query['goat_status'] = goat_status
    if country:
        query['countries'] = country
    if insdc_status:
        query['insdc_status'] = insdc_status
    if target_list_status:
        query['target_list_status'] = target_list_status
    if user:
        user_object = BioGenomeUser.objects(name=user).first()
        query['taxid__in'] = user_object.species

    organisms = organisms.filter(**query)

    if sort_column:
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        organisms = organisms.order_by(sort)
    return organisms.count(), organisms[int(offset):int(offset)+int(limit)]


def get_organism_related_data(taxid, model):
    organism_obj = Organism.objects(taxid=taxid).first()
    if not organism_obj or not model in MODEL_LIST.keys():
        raise NotFound
    mapped_model = MODEL_LIST.get(model)
    return mapped_model.get('model').objects(taxid=taxid)

def get_organism_related_datum(taxid,model,id):
    organism_obj = Organism.objects(taxid=taxid).first()
    if not organism_obj or not model in MODEL_LIST.keys():
        raise NotFound
    
    mapped_model = MODEL_LIST.get(model)
    query = {
        f"{mapped_model.get('id')}":id,
        "taxid":taxid
    }
    datum = mapped_model.get("model").objects(**query).first()
    if not datum:
        raise NotFound
    return datum

def get_stats(organisms):
    stats = dict()
    biosamples_count = organisms.filter(biosamples__not__size=0).count()
    if biosamples_count > 0:
        stats['biosamples'] = biosamples_count
    local_samples_count = organisms.filter(local_samples__not__size=0).count()
    if local_samples_count > 0:
        stats['local_samples'] = local_samples_count
    assemblies_count = organisms.filter(assemblies__not__size=0).count()
    if assemblies_count > 0:
        stats['assemblies'] = assemblies_count
    experiments_count = organisms.filter(experiments__not__size=0).count()
    if experiments_count > 0:
        stats['experiments'] = experiments_count
    annotations_count = organisms.filter(annotations__not__size=0).count()
    if annotations_count > 0:
        stats['annotations'] = annotations_count
    return stats

def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'common_name':
        return (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter))
    elif option == 'tolid':
        return (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def retrieve_taxonomic_info(taxid):
    taxon_xml = ena_client.get_taxon_from_ena(taxid)
    if taxon_xml:
        lineage = parse_taxon_from_ena(taxon_xml)
        insdc_common_name = lineage[0].get('commonName')
        scientific_name = lineage[0].get('scientificName')

    else:
        taxon_nodes = ncbi_client.get_taxon(taxid)
        if not taxon_nodes or not len(taxon_nodes) or not taxon_nodes[0].get('taxonomy'):
            print('TAXID NOT FOUND', taxid)
            return
        taxid, scientific_name, insdc_common_name, lineage = parse_organisms_from_ncbi_data(taxon_nodes)[0]
    return scientific_name, insdc_common_name, lineage

def get_or_create_organism(taxid):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
        tax_info_tuple = retrieve_taxonomic_info(taxid)
        if not tax_info_tuple:
            return
        scientific_name, insdc_common_name, lineage = tax_info_tuple
        taxon_lineage = taxons_service.create_taxons_from_lineage(lineage)
        tolid = ena_client.get_tolid(taxid)
        taxon_list = [tax.taxid for tax in taxon_lineage]
        organism = Organism(taxid = taxid, insdc_common_name=insdc_common_name, scientific_name= scientific_name, taxon_lineage = taxon_list, tolid_prefix=tolid).save()
        taxons_service.leaves_counter(taxon_lineage)
    return organism

def create_organism_from_taxonomic_info(taxid, scientific_name, insdc_common_name, lineage):
    taxon_lineage = taxons_service.create_taxons_from_lineage(lineage)
    tolid = ena_client.get_tolid(taxid)
    taxon_list = [tax.taxid for tax in taxon_lineage]
    organism = Organism(taxid = taxid, insdc_common_name=insdc_common_name, scientific_name= scientific_name, taxon_lineage = taxon_list, tolid_prefix=tolid).save()
    taxons_service.leaves_counter(taxon_lineage)
    return organism

def update_organism(data, taxid):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
        raise NotFound
    organism_data = map_organism_data(data,taxid)

    organism.update(**organism_data)

    
    return f"Organism {organism.scientific_name} correctly updated", 201

def create_organism(data):
    taxid = data.get('taxid')
    if not taxid:
        return "Taxid is mandatory", 400
    
    if Organism.objects(taxid=taxid).count():
        return f"An organism with taxid {taxid} already exists", 400
        ## add organism to user 
    claims = get_jwt()
    role = claims.get('role')
    name = claims.get('username')
    user = BioGenomeUser.objects(name=name).first()
            
    organism = get_or_create_organism(taxid)
    if not organism:
        return f"Organisms with taxid {taxid} not found in INSDC", 400
    organism_data = map_organism_data(data, taxid)
    organism.update(**organism_data)
    organism.save()
    if role and role == 'DataManager':
        user.modify(add_to_set__species=taxid)


    return f"Organism {organism.scientific_name} correctly saved", 201

def map_organism_data(data,taxid):
    organism = dict()
    filtered_data = {k: v for k, v in data.items() if v}

    string_attrs = {k: v for k, v in filtered_data.items() if isinstance(v, str)}

    image = filtered_data.get('image')

    organism['image'] = image
    sample_locations_service.add_image(taxid, image)

    for key, value in string_attrs.items():
        organism[key] = value

    organism['metadata'] = filtered_data.get('metadata')

    organism['common_names'] = None
    if filtered_data.get('common_names'):
        organism['common_names'] = [CommonName(**c_name) for c_name in filtered_data['common_names'] if 'value' in c_name]
    organism['image_urls'] = filtered_data.get('image_urls')

    organism['publications'] = None
    if filtered_data.get('publications'):
        organism['publications'] = [Publication(**pub) for pub in filtered_data.get('publications', []) if 'id' in pub]
    return organism

def parse_taxon_from_ena(xml):
    root = etree.fromstring(xml)
    organism = root[0].attrib
    lineage = []
    for taxon in root[0]:
        if taxon.tag == 'lineage':
            for node in taxon:
                lineage.append(node.attrib)
    lineage.insert(0,organism)
    return lineage

#map lineage into tree structure
def map_organism_lineage(lineage):
    root_to_organism = list(reversed(lineage))
    tree=dict()
    root = TaxonNode.objects(taxid=root_to_organism[0]).first()
    taxonomy_service.dfs_generator([(root,0)],tree, root_to_organism)
    return tree


def parse_organisms_from_ncbi_data(taxonomy_nodes):
    parsed_tuples = []
    for taxonomy_node in taxonomy_nodes:
        tax_node = taxonomy_node.get('taxonomy')
        taxid = str(tax_node.get('tax_id'))
        insdc_common_name = tax_node.get('common_name')
        scientific_name = tax_node.get('organism_name')
        lineage_taxids = [str(n) for n in  tax_node.get('lineage')]
        unordered_lineage = ncbi_client.get_lineage(lineage_taxids)
        lineage = [
            {
                'scientificName': taxon_node.get('taxonomy').get('organism_name'),
                'taxId': taxon_node.get('taxonomy').get('tax_id'),
                'rank': taxon_node.get('taxonomy').get('rank').lower()
            }
            for taxon_id in reversed(lineage_taxids)
            for taxon_node in unordered_lineage
            if taxon_id == taxon_node.get('taxonomy').get('tax_id')
        ]
        parsed_tuples.append((taxid, scientific_name, insdc_common_name, lineage))
    
    return parsed_tuples

def delete_organism(taxid):
    organism_to_delete = Organism.objects(taxid=taxid).first()
    if not organism_to_delete:
        raise NotFound
    organism_to_delete.delete()
    return f"Organisms {taxid} succesfully deleted", 200
    