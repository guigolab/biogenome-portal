from ..utils import ena_client,ncbi_client
from ..taxon import taxons_service
from ..taxonomy import taxonomy_service
from ..sample_location import sample_locations_service
from db.models import CommonName,TaxonNode, Organism, Publication,BioGenomeUser
import os 
from lxml import etree
from errors import NotFound
from flask_jwt_extended import get_jwt
from ..utils.extensions import cache


ROOT_NODE=os.getenv('ROOT_NODE')
PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')


FIELDS_TO_EXCLUDE = ['id']

@cache.memoize(timeout=300)
def get_organisms_taxid_from_parent_taxid(taxid):
    return Organism.objects(taxon_lineage=taxid).scalar('taxid')


def retrieve_taxons(taxids):

    taxon_xml = ena_client.get_taxon_from_ena_browser(taxid)
    if taxon_xml:
        lineage = parse_taxon_from_ena(taxon_xml)
        insdc_common_name = lineage[0].get('commonName')
        scientific_name = lineage[0].get('scientificName')

    else:
        taxon_nodes = ncbi_client.get_taxon(taxid)
        if not taxon_nodes or not len(taxon_nodes) or not taxon_nodes[0].get('taxonomy'):

        ##try ena portal

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