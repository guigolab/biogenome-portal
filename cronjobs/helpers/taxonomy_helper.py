from db.models import TaxonNode,Organism
from lxml import etree
import requests
import utils 

CHUNK_SIZE = 9999

# #return a dict of lineages by taxid
# def parse_taxons_from_ena(xml):
#     #tuple containing the organism and the parsed taxon lineage
#     taxon_tuples = []
#     root = etree.fromstring(xml)
#     for node in root:
#         organism_to_save=dict()
#         organism = node.attrib
#         organism_to_save['taxid'] = organism['taxId']
#         organism_to_save['scientific_name'] = organism_to_save['scientificName']
#         if 'commonName' in organism.keys():
#             organism_to_save['insdc_common_name'] = organism['commonName']
#         organism_to_save['taxon_lineage'] = []
#         lineage_to_save = []
#         for taxon in node:
#             if taxon.tag == 'lineage':
#                 for lineage_node in taxon:
#                     tax_name = lineage_node['scientificName']
#                     if tax_name == 'root':
#                         continue
#                     rank = 'rank' if 'rank' in lineage_node.keys() else 'other'
#                     taxid = lineage_node['taxId']
#                     taxon_to_save = dict(name=tax_name,rank=rank,taxid=taxid)
#                     organism_to_save['taxon_lineage'].append(taxid)
#                     lineage_to_save.append(TaxonNode(**taxon_to_save))
#         taxon_tuples.append([Organism(**organism_to_save), lineage_to_save])
#     return taxon_tuples


def parse_taxons_from_ena(xml):
    taxon_tuples = []

    root = etree.fromstring(xml)

    for node in root:
        organism = node.attrib
        taxon_lineage = []

        organism_to_save = {
            'taxid': organism['taxId'],
            'scientific_name': organism['scientificName'],
            'insdc_common_name': organism.get('commonName'),
            'taxon_lineage': taxon_lineage,
        }

        lineage_to_save = []

        for taxon in node:
            if taxon.tag == 'lineage':
                for lineage_node in taxon:
                    tax_name = lineage_node.get('scientificName')
                    if tax_name == 'root':
                        continue
                    rank = lineage_node.get('rank', 'other')
                    taxid = lineage_node.get('taxId')

                    taxon_to_save = {
                        'name': tax_name,
                        'rank': rank,
                        'taxid': taxid,
                    }

                    taxon_lineage.append(taxid)
                    lineage_to_save.append(TaxonNode(**taxon_to_save))

        taxon_tuples.append([Organism(**organism_to_save), lineage_to_save])

    return taxon_tuples

def get_taxons_from_ena(taxids):
    if len(taxids) > CHUNK_SIZE:
        chunks = list(utils.split_list_into_chunks(taxids, CHUNK_SIZE))
        print(f"Original list has {len(taxids)} elements.")
        print(f"It has been split into {len(chunks)} smaller lists, each containing {CHUNK_SIZE} or fewer elements.")
    else:
        chunks = taxids
        print(F"The list does not have more than {CHUNK_SIZE} elements.")
    all_mapped_taxons = []
    for chunk in chunks:
        try:
            data = dict(accessions=chunk)
            response = requests.post("https://www.ebi.ac.uk/ena/browser/api/xml?download=false", params=data)
            all_mapped_taxons.extend(parse_taxons_from_ena(response))
        except Exception as e:
            print('An error occurred while fetching taxons from ena: {e}')
            break
    return all_mapped_taxons


def create_taxons_from_lineages(lineages):
    # Create a list to store the updates
    saved_taxons = []
    for lineage in lineages:
        taxon_lineage = []
        
        # Use a list comprehension for faster taxon retrieval
        taxon_lineage = [TaxonNode.objects(taxid=node['taxId']).first() or node.save() for node in lineage]

        # Create bulk update operations for adding children to fathers
        for index, child_taxon in enumerate(taxon_lineage[:-1]):
            father_taxon = taxon_lineage[index + 1]
            father_taxon.modify(add_to_set__children=child_taxon.taxid)
        saved_taxons.extend(taxon_lineage)
    return saved_taxons

def update_organisms(new_saved_data, query_key):
    taxids = [new_object.taxid for new_object in new_saved_data]
    organisms_to_update = Organism.objects(taxid__in=taxids)
    for organism_to_update in organisms_to_update:
        for new_object in new_saved_data:
            if new_object.taxid == organism_to_update.taxid:
                query=dict()
                query[query_key]=new_object.accession
                organism_to_update.modify(**query)
                organism_to_update.save()

# def count_taxon_leaves_from_organisms(new_taxids):
#     for taxon in taxons:
#         taxon.update(leaves=Organism.objects(taxon_lineage=taxon.taxid, taxid__ne=taxon.taxid).count())

"""
From a list of taxids retrieve the organism info and its lineage 
returns a list of tuples
"""
def create_organisms_and_lineage(taxids):
    existing_organisms = utils.get_objects_by_scalar_id(Organism,'taxid',dict(taxid__in=taxids))
    new_taxids = [taxid for taxid in taxids if not taxid in existing_organisms]
    print(f'Retrieving {len(new_taxids)} taxons from ENA')
    organisms_lineage_tuples = get_taxons_from_ena(new_taxids)
    #save organisms
    print(f'Saving new organisms: {len(organisms_lineage_tuples)}')
    utils.insert_data(Organism, [t[0] for t in organisms_lineage_tuples])

    create_taxons_from_lineages([t[1] for t in organisms_lineage_tuples])

    #update taxons