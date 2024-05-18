from db.models import TaxonNode, Organism
import os 
from lxml import etree
from utils.extensions.cache import cache
from utils.clients import ebi_client, ncbi_client, tolid_client
from utils.parsers import taxonomy

ROOT_NODE=os.getenv('ROOT_NODE')
PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')


FIELDS_TO_EXCLUDE = ['id']

@cache.memoize(timeout=300)
def get_organisms_taxid_from_parent_taxid(taxid):
    return Organism.objects(taxon_lineage=taxid).scalar('taxid')


def create_organism_and_related_taxons(taxid):
    organism_data, parsed_taxons = retrieve_taxonomic_info(taxid)
    if not organism_data:
        raise None
    
    #retrieve tolid prefix
    organism_data['tolid_prefix'] = tolid_client.get_tolid(taxid)
    
    organism = Organism(**organism_data).save()

    if parsed_taxons:
        save_parsed_taxons(parsed_taxons)
        ordered_nodes = get_and_order_saved_taxon_nodes(organism_data)
        update_taxon_hierarchy(ordered_nodes)

    return organism

def get_and_order_saved_taxon_nodes(organism_data):
    taxon_lineage = organism_data['taxon_lineage']
    # Retrieve the taxon nodes from the database
    taxon_nodes = TaxonNode.objects(taxid__in=taxon_lineage)
    
    # Create a dictionary for quick lookup
    taxon_node_dict = {node.taxid: node for node in taxon_nodes}
    
    # Order the taxon nodes based on the taxon_lineage
    ordered_taxon_list = [taxon_node_dict[taxid] for taxid in taxon_lineage if taxid in taxon_node_dict]

    return ordered_taxon_list

def update_taxon_hierarchy(ordered_nodes):
    for index in range(len(ordered_nodes) - 1):
        child_taxon = ordered_nodes[index]
        father_taxon = ordered_nodes[index + 1]
        leaves = count_leaves(father_taxon)
        father_taxon.modify(add_to_set__children=child_taxon.taxid, leaves=leaves)


def count_leaves(father_taxon):
    return Organism.objects(taxon_lineage=father_taxon.taxid, taxid__ne=father_taxon.taxid).count()


def retrieve_taxonomic_info(taxid):
    organism_data = {}
    parsed_taxons = []

    organism_data, parsed_taxons = get_info_from_ncbi(taxid)
    if organism_data:
        return organism_data, parsed_taxons

    organism_data, parsed_taxons = get_info_from_ena_browser(taxid)
    if organism_data:
        return organism_data, parsed_taxons

    organism_data, parsed_taxons = get_info_from_ena_portal(taxid)
    if organism_data:
        return organism_data, parsed_taxons

    return None, None


def get_info_from_ncbi(taxid):
    args = ['taxonomy', 'taxon', taxid, '--parents']
    report = ncbi_client.get_data_from_ncbi(args)
    if report and report.get('reports'):
        organism_data = {taxid:taxid}
        for taxon_report in report.get('reports'):
            if str(taxon_report.get('tax_id')) == taxid:
                organism_data['scientific_name'] = taxon_report.get('current_scientific_name').get('name')
                organism_data['insdc_common_name'] = taxon_report.get('curator_common_name')
                taxon_lineage = [taxon_report]
                taxon_lineage.extend(list(reversed([str(tax) for tax in taxon_report.get('parents') if tax != 1])))
                organism_data['taxon_lineage'] = taxon_lineage
                parsed_taxons = taxonomy.parse_taxons_from_ncbi_datasets(taxon_lineage)
                return organism_data, parsed_taxons
    return None, None

def get_info_from_ena_browser(taxid):
    taxon_xml = ebi_client.get_taxon_from_ena_browser(taxid)
    if taxon_xml:
        organism, parsed_taxons = taxonomy.parse_taxons_from_ena_browser(taxon_xml)
        organism_data = {
            'taxid':taxid,
            'insdc_common_name': organism.get('commonName'),
            'scientific_name': organism.get('scientificName'),
            'taxon_lineage': [taxon.taxid for taxon in parsed_taxons]
        }
        return organism_data, parsed_taxons
    return None, None

def get_info_from_ena_portal(taxid):
    taxon = ebi_client.get_taxon_from_ena_portal(taxid)
    if taxon:
        taxon_to_parse = taxon[0]
        organism_data = {
            'taxid': taxid,
            'scientific_name': taxon_to_parse.get('scientific_name'),
            'insdc_common_name': taxon_to_parse.get('common_name'),
            'taxon_lineage': list(reversed([taxon_taxid.strip() for taxon_taxid in taxon_to_parse.get('tax_lineage').split(';') if taxon_taxid != '1']))
        }
        parsed_taxons = [taxonomy.parse_taxon_from_ena_portal(taxon_to_parse)]
        for lineage_taxid in organism_data['taxon_lineage']:
            if lineage_taxid != taxid:
                lineage_taxon = ebi_client.get_taxon_from_ena_portal(lineage_taxid)
                if lineage_taxon:
                    parsed_taxons.append(taxonomy.parse_taxon_from_ena_portal(lineage_taxon[0]))
        return organism_data, parsed_taxons
    return None, None

def save_parsed_taxons(parsed_taxons):
    existing_taxids = TaxonNode.objects(taxid__in=[t.taxid for t in parsed_taxons]).scalar('taxid')
    taxons_to_save = [taxon for taxon in parsed_taxons if taxon.taxid not in existing_taxids]
    if taxons_to_save:
        TaxonNode.objects.insert(taxons_to_save)


