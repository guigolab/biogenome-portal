from db.models import Organism
from clients import ebi_client, ncbi_client
from parsers import taxonomy as taxonomy_parser, organism as organism_parser
from . import taxonomy as taxonomy_helper

TAXID_LIST_LIMIT=5000

def handle_organism(taxid):
    organism_obj = Organism.objects(taxid=taxid).first()
    if not organism_obj:
        organism_obj = create_organism_and_related_taxons(taxid)
    return organism_obj

def handle_taxonomic_ids(documents_to_save):
    taxid_list = list(set(doc.taxid for doc in documents_to_save))
    existing_taxid_list = Organism.objects(taxid__in=taxid_list).scalar('taxid')
    new_taxid_list = [taxid for taxid in taxid_list if taxid not in existing_taxid_list]
    new_documents_to_save = list(documents_to_save)
    if new_taxid_list:
        print(f"New organisms to save: {len(new_taxid_list)}")
        created_organisms = create_organisms_from_ena_browser(new_taxid_list)
        if created_organisms:
            print(f"A total of {len(created_organisms)} have been created")
            created_taxid_list = [org.taxid for org in created_organisms]
            missing_taxid_list = [taxid for taxid in new_taxid_list if taxid not in created_taxid_list]
            if missing_taxid_list:
                print(f"A total of {len(missing_taxid_list)} organisms have not been found in INSDC, skipping related data")
                new_documents_to_save = [exp for exp in documents_to_save if exp.taxid not in missing_taxid_list]
        else:
            new_documents_to_save = [doc for doc in documents_to_save if doc.taxid not in new_taxid_list]
            print(f"Any organisms found in INSDC")
    return new_documents_to_save


def create_organisms_from_ena_browser(new_taxid_list):
    
    chunks = [new_taxid_list[i:i+TAXID_LIST_LIMIT] for i in range(0, len(new_taxid_list), TAXID_LIST_LIMIT)] if len(new_taxid_list) >= TAXID_LIST_LIMIT else [new_taxid_list]
    saved_organisms=[]
    for index, chunk in enumerate(chunks):
        try:
            print(f"Retrieving chunk {index+1} of {len(chunks)}")
            response_xml = ebi_client.get_objects_from_ena_browser(chunk)
            
            organism_list, parsed_taxon_list = taxonomy_parser.parse_taxons_from_ena_browser(response_xml)
            organisms_to_save = []
            
            for org, lineage in zip(organism_list, parsed_taxon_list):
                organism_to_save = organism_parser.parse_organism_from_ena_browser(org, lineage)

                if Organism.objects(taxid=organism_to_save.taxid):
                    continue   

                organisms_to_save.append(organism_to_save)
                taxonomy_helper.save_parsed_taxons(lineage)
            
            if organisms_to_save:
                saved_organisms.extend(Organism.objects.insert(organisms_to_save))
                for org in organisms_to_save:
                    ordered_nodes = taxonomy_helper.get_and_order_saved_taxon_nodes(org)
                    taxonomy_helper.update_taxon_hierarchy(ordered_nodes)
        except Exception as e:
            print(e)
    return saved_organisms


def create_organism_and_related_taxons(taxid):
    organism_obj, parsed_taxons = retrieve_taxonomic_info(taxid)
    if not organism_obj:
        return None
    
    organism_obj.save()

    if parsed_taxons:
        taxonomy_helper.save_taxons_and_update_hierachy(parsed_taxons, organism_obj)

    return organism_obj


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
        organism_to_save = None
        for taxon_report in report.get('reports'):
            if str(taxon_report.get('tax_id')) == taxid:
                organism_to_save = organism_parser.parse_organism_from_ncbi_dataset(taxon_report)
        parsed_taxons = taxonomy_parser.parse_taxons_from_ncbi_datasets(report.get('reports'))
        return organism_to_save, parsed_taxons
    return None, None

def get_info_from_ena_browser(taxid):
    taxon_xml = ebi_client.get_taxon_from_ena_browser(taxid)
    if taxon_xml:
        organism_to_parse, parsed_taxons = taxonomy_parser.parse_taxon_from_ena_browser(taxon_xml)
        organism_to_save = organism_parser.parse_organism_from_ena_browser(organism_to_parse, parsed_taxons)
        return organism_to_save, parsed_taxons
    return None, None

def get_info_from_ena_portal(taxid):
    taxon = ebi_client.get_taxon_from_ena_portal(taxid)
    if taxon:
        taxon_to_parse = taxon[0]
        organism_to_save = organism_parser.parse_organism_from_ena_portal(taxon_to_parse)
        parsed_taxons = [taxonomy_parser.parse_taxon_from_ena_portal(taxon_to_parse)]
        for lineage_taxid in organism_to_save.taxon_lineage:
            if lineage_taxid != taxid:
                lineage_taxon = ebi_client.get_taxon_from_ena_portal(lineage_taxid)
                if lineage_taxon:
                    parsed_taxons.append(taxonomy_parser.parse_taxon_from_ena_portal(lineage_taxon[0]))
        return organism_to_save, parsed_taxons
    return None, None
