from db.models import TaxonNode,Organism
from db.enums import GoaTStatus,INSDCStatus
from lxml import etree
import requests
from . import utils 

CHUNK_SIZE = 9999

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
                    taxid = str(lineage_node.get('taxId'))

                    taxon_to_save = {
                        'name': tax_name,
                        'rank': rank,
                        'taxid': taxid,
                    }

                    taxon_lineage.append(taxid)
                    lineage_to_save.append(TaxonNode(**taxon_to_save))
        lineage_to_save.insert(0, TaxonNode(**{
                        'name': organism['scientificName'],
                        'rank': organism.get('rank', 'other'),
                        'taxid': str(organism['taxId']),
        }))

        taxon_tuples.append([Organism(**organism_to_save), lineage_to_save])

    return taxon_tuples

def fetch_taxons_from_ena(taxids):
    if len(taxids) > CHUNK_SIZE:
        chunks = list(utils.split_list_into_chunks(taxids, CHUNK_SIZE))
        print(f"Original taxid list has {len(taxids)} elements.")
        print(f"It has been split into {len(chunks)} smaller lists, each containing {CHUNK_SIZE} or fewer elements.")
    else:
        chunks = [taxids]
        print(f"The taxid list has {len(taxids)} elements")
    all_mapped_taxons = []
    for chunk in chunks:
        try:
            data = dict(accessions=chunk)
            response = requests.post("https://www.ebi.ac.uk/ena/browser/api/xml?download=false", params=data)
            all_mapped_taxons.extend(parse_taxons_from_ena(response.content))
        except Exception as e:
            print(f'An error occurred while fetching taxons from ena: {e}')
            break
    return all_mapped_taxons


def create_taxons_from_lineages(lineages):
    # Create a list to store the updates
    saved_taxons = []
    for lineage in lineages:
        taxon_lineage = []

        # Use a li comprehension for faster taxon retrieval
        taxon_lineage = [TaxonNode.objects(taxid=node.taxid).first() or node.save() for node in lineage]

        # Create bulk update operations for adding children to fathers
        for index, child_taxon in enumerate(taxon_lineage[:-1]):
            father_taxon = taxon_lineage[index + 1]
            father_taxon.modify(add_to_set__children=child_taxon.taxid)
        saved_taxons.extend(taxon_lineage)
    return saved_taxons


def update_organisms(new_saved_data, object_id_key, organism_attr, update_status=False):
    # Create a dictionary to group new_saved_data by taxid
    taxid_to_new_objects = {}
    for new_object in new_saved_data:
        taxid = str(new_object.taxid)
        if taxid not in taxid_to_new_objects.keys():
            taxid_to_new_objects[taxid] = []
        taxid_to_new_objects[taxid].append(new_object[object_id_key])


    # Query organisms to update based on unique taxids
    unique_taxids = list(taxid_to_new_objects.keys())
    organisms_to_update = Organism.objects(taxid__in=unique_taxids)
    print(f'Updating organisms {len(organisms_to_update)}')
    for organism_to_update in organisms_to_update:
        taxid = organism_to_update.taxid
        if taxid in taxid_to_new_objects.keys():
            print('Updating organism')
            organism_to_update[organism_attr].extend(taxid_to_new_objects[taxid])
            if update_status:
                update_organism_status(organism_to_update)
            # Modify the organism and save it
            organism_to_update.save()

            print(organism_to_update.to_json())

"""
From a list of taxids retrieve the organism info and its lineage 
returns a list of tuples
"""
def create_organisms_and_lineage(taxids):
    existing_organisms = utils.get_objects_by_scalar_id(Organism,'taxid',dict(taxid__in=taxids))
    new_taxids = [taxid for taxid in taxids if not taxid in existing_organisms]
    if not new_taxids:
        print(f'No new taxids found')
        return True
    print(f'Retrieving {len(new_taxids)} taxons from ENA')
    organisms_lineage_tuples = fetch_taxons_from_ena(new_taxids)
    #save organisms
    if not organisms_lineage_tuples:
        print('No organisms retrieved from ENA...')
        return False
    
    print(f'Saving new organisms: {len(organisms_lineage_tuples)}')
    utils.insert_data(Organism, [t[0] for t in organisms_lineage_tuples])

    taxon_nodes = create_taxons_from_lineages([t[1] for t in organisms_lineage_tuples])
    for taxon in taxon_nodes:
        taxon.modify(leaves=Organism.objects(taxon_lineage=taxon.taxid, taxid__ne=taxon.taxid).count())
    #update taxons
    return True

def update_organism_status(organism):
    if organism.assemblies:
        organism.insdc_status= INSDCStatus.ASSEMBLIES
        organism.goat_status=GoaTStatus.INSDC_SUBMITTED
    if organism.experiments:
        organism.insdc_status= INSDCStatus.READS
        organism.goat_status=GoaTStatus.IN_ASSEMBLY
    if organism.biosamples:
        organism.insdc_status=INSDCStatus.SAMPLE
        organism.goat_status = GoaTStatus.SAMPLE_ACQUIRED
