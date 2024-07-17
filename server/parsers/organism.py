from db.models import Organism
from clients import tolid_client
from db.enums import GoaTStatus

GOAT_STATUS_IMPORT_MAPPER={
    "sample_collected":GoaTStatus.SAMPLE_COLLECTED,
    "sample_acquired":GoaTStatus.SAMPLE_ACQUIRED,
    "data_generation":GoaTStatus.DATA_GENERATION,
    "in_assembly":GoaTStatus.IN_ASSEMBLY,
    "insdc_submitted":GoaTStatus.INSDC_SUBMITTED,
    "publication_available":GoaTStatus.PUBLICATION_AVAILABLE
}

def parse_organism_from_ncbi_dataset(organism_data):
    parsed_organism = {
        'taxid':organism_data.get('taxid'),
        'scientific_name': organism_data.get('current_scientific_name',{}).get('name'),
        'tolid_prefix': tolid_client.get_tolid(organism_data.get('taxid')) ,
        'insdc_common_name': organism_data.get('curator_common_name'),
        'taxon_lineage': [ organism_data.get('taxid'), list(reversed([str(tax) for tax in organism_data.get('parents') if tax != 1]))]
    }
    return Organism(**parsed_organism)

def parse_organism_from_ena_browser(organism_data, parsed_taxons):
    parsed_organism = {
        'taxid':organism_data.get('taxId'),
        'insdc_common_name': organism_data.get('commonName'),
        'scientific_name': organism_data.get('scientificName'),
        'tolid_prefix': tolid_client.get_tolid(organism_data.get('taxid')) ,
        'taxon_lineage': [taxon.taxid for taxon in parsed_taxons]
    }
    return Organism(**parsed_organism)


def parse_organism_from_ena_portal(organism_data):
    parsed_organism = {
        'taxid': organism_data.get('tax_id'),
        'scientific_name': organism_data.get('scientific_name'),
        'tolid_prefix': tolid_client.get_tolid(organism_data.get('taxid')) ,
        'insdc_common_name': organism_data.get('common_name'),
        'taxon_lineage': list(reversed([taxon_taxid.strip() for taxon_taxid in organism_data.get('tax_lineage').split(';') if taxon_taxid != '1']))
    }
    return Organism(**parsed_organism)



