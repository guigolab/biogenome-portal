from typing import Set

from clients import ebi_client, ncbi_client, tolid_client
from db.documents import Assembly, BioSample, Organism, ReadRun, TaxonNode
from helpers.taxon_organism_sync import sync_many_taxids
from parsers import taxonomy as taxonomy_parser, organism as organism_parser
from . import taxonomy as taxonomy_helper
from . import data as data_helper
from lxml import etree
import gzip
import os
import time


TAXID_LIST_LIMIT=5000


def _sync_organisms_after_bulk_insert(organisms):
    """Refresh organism status + TaxonNode counts after ``Organism.objects.insert`` (no signals)."""
    if not organisms:
        return
    sync_many_taxids(org.taxid for org in organisms)


def _insert_new_taxon_nodes_from_dict(taxons_dict):
    """Insert ``TaxonNode`` docs from a taxid -> TaxonNode mapping for ids not yet in the DB."""
    if not taxons_dict:
        return
    existing_taxons = TaxonNode.objects(taxid__in=list(taxons_dict.keys())).scalar("taxid")
    new_taxons = [taxon for taxid, taxon in taxons_dict.items() if taxid not in existing_taxons]
    if new_taxons:
        TaxonNode.objects.insert(new_taxons)


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
                _sync_organisms_after_bulk_insert(organisms_to_save)
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


def fetch_new_organisms(taxids, tmp_dir):
    """
    Fetch new organisms from ENA browser in bulk (up to 10k taxids at a time) and parse
    Returns a list of Organism objects and a dictionary of TaxonNode objects (taxid: TaxonNode object)
    """
    batches = data_helper.create_batches(taxids, TAXID_LIST_LIMIT)
    organisms = []
    taxons_dict = dict()
    for idx, batch in enumerate(batches):
        # Use index in filename to avoid collisions when different batches have same length
        path_to_gzipped_xml_file = os.path.join(tmp_dir, f'taxons_{idx}_{len(batch)}.xml.gz')
        fetch_success = ebi_client.get_xml_from_ena_browser(batch, path_to_gzipped_xml_file)
        if not fetch_success or not os.path.exists(path_to_gzipped_xml_file) or os.path.getsize(path_to_gzipped_xml_file) == 0:
            continue

        new_organisms, new_taxons_dict = parse_taxons_and_organisms_from_ena_browser(path_to_gzipped_xml_file)
        organisms.extend(new_organisms)
        taxons_dict.update(new_taxons_dict)

        # Best-effort cleanup to save disk space
        try:
            os.remove(path_to_gzipped_xml_file)
        except Exception:
            pass
    return organisms, taxons_dict

def parse_taxons_and_organisms_from_ena_browser(xml_path):
    """
    Memory-efficient streaming parser for ENA taxonomy XML files (gzipped).
    Assumes valid ENA structure:
      <TAXON_SET><taxon>...</taxon> ... </TAXON_SET>
    Only top-level <taxon> nodes represent organisms.
    Returns a list of tuples, where the first element is an Organism object and the second element is a list of TaxonNode objects not yet saved in the database
    """
    organisms = []
    taxons_dict = dict()
    with gzip.open(xml_path, "rb") as f:
        # Stream everything; handle tag=taxon manually
        context = etree.iterparse(f, events=("end",))

        for _, elem in context:
            if elem.tag != "taxon":
                continue

            parent = elem.getparent()
            if parent is None or parent.tag != "TAXON_SET":
                # lineage/child taxons—do NOT clear them now
                continue

            # --------- Top-level organism taxon ---------
            taxid = elem.get("taxId")
            if not taxid:
                elem.clear()
                continue

            organism = Organism(
                taxid=taxid,
                scientific_name=elem.get("scientificName"),
                insdc_common_name=elem.get("commonName"),
                taxon_lineage=[taxid]
            )

            # --------- Parse lineage ---------
            lineage_elem = elem.find("lineage")
            if lineage_elem is not None:
                for lt in lineage_elem.findall("taxon"):
                    lt_taxid = lt.get("taxId")
                    if not lt_taxid or lt.get("scientificName") == "root":
                        continue

                    organism.taxon_lineage.append(lt_taxid)
                    if lt_taxid not in taxons_dict:
                        taxons_dict[lt_taxid] = TaxonNode(
                            taxid=lt_taxid,
                            name=lt.get("scientificName"),
                            rank=lt.get("rank") or "other"
                        )

            organisms.append(organism)

            # --------- Memory cleanup ONLY for top-level taxon ---------
            elem.clear()
            while elem.getprevious() is not None:
                del elem.getparent()[0]

    return organisms, taxons_dict


def handle_full_taxonomy_from_taxids(taxids, tmp_dir, fetch_tolid_prefixes_sync=True):
    """
    Fetch full taxonomy from ENA browser in bulk (up to 10k taxids at a time) and parse
    Returns the list of saved organisms taxids.

    If fetch_tolid_prefixes_sync is False, ToLID prefix lookup is skipped here so a Celery
    task (e.g. jobs.organisms.fetch_tolid_prefixes_task) can run it asynchronously.
    """
    saved_taxids = []
    taxon_lineage_taxids_to_refresh: Set[str] = set()
    batches = data_helper.create_batches(taxids, TAXID_LIST_LIMIT)
    for batch in batches:
        existing_taxids = Organism.objects(taxid__in=batch).scalar('taxid')
        new_taxids = [taxid for taxid in batch if taxid not in existing_taxids]
        if new_taxids:
            organisms, taxons_dict = fetch_new_organisms(new_taxids, tmp_dir)
            if organisms:
                Organism.objects.insert(organisms)
                saved_taxids.extend([org.taxid for org in organisms])
                for org in organisms:
                    taxon_lineage_taxids_to_refresh.update(org.taxon_lineage)
                _sync_organisms_after_bulk_insert(organisms)
            taxon_lineage_taxids_to_refresh.update(taxons_dict.keys())
            _insert_new_taxon_nodes_from_dict(taxons_dict)
    if taxon_lineage_taxids_to_refresh:
        taxonomy_helper.bulk_refresh_taxon_node_leaves(taxon_lineage_taxids_to_refresh)
    if fetch_tolid_prefixes_sync and saved_taxids:
        fetch_tolid_prefixes(saved_taxids)
    return saved_taxids


def fetch_tolid_prefixes(taxids):
    batches = data_helper.create_batches(taxids, TAXID_LIST_LIMIT)
    for batch in batches:
        #counter to avoid rate limiting
        counter = 0
        for taxid in batch:
            tolid_prefix = tolid_client.get_tolid(taxid)
            if tolid_prefix:
                Organism.objects(taxid=taxid).update(tolid_prefix=tolid_prefix)
            counter += 1
            if counter == 3:
                time.sleep(1)
                counter = 0


def reload_organisms_and_update_deps(saved_organism_taxids):
    if not saved_organism_taxids:
        return
    reload_organisms = Organism.objects(taxid__in=saved_organism_taxids)
    taxids_for_sync = []
    for organism in reload_organisms:
        ordered_taxons = taxonomy_helper.get_ordered_taxons(organism.taxon_lineage)
        taxonomy_helper.update_taxon_hierarchy(ordered_taxons)
        BioSample.objects(taxid=organism.taxid).update(taxon_lineage=organism.taxon_lineage)
        Assembly.objects(taxid=organism.taxid).update(taxon_lineage=organism.taxon_lineage)
        ReadRun.objects(taxid=organism.taxid).update(taxon_lineage=organism.taxon_lineage)
        taxids_for_sync.append(organism.taxid)
    # Bulk .update() skips signals; one batched refresh for status + TaxonNode counts
    sync_many_taxids(taxids_for_sync)
