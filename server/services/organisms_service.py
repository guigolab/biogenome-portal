from db.models import Organism
from utils import ena_client,utils
from services import taxon_service


def get_or_create_organism(taxid, common_names=None):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
        taxon_xml = ena_client.get_taxon_from_ena(taxid)
        if not taxon_xml:
            return
        lineage = utils.parse_taxon(taxon_xml)
        species = lineage[0]
        taxon_lineage = taxon_service.create_taxons_from_lineage(lineage)
        organism = Organism(taxid = taxid, organism= species['scientificName'], taxon_lineage = taxon_lineage).save()
    if common_names and len(common_names.split('|')) > 0:
        names_arr = common_names.split('|')
        if len(organism.common_name) > 0:
            names_arr = [name for name in names_arr if name not in organism.common_name]
        organism.modify(push_all__common_name=names_arr)
    return organism


