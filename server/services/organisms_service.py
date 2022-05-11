from db.models import Assembly, Experiment, Organism, SecondaryOrganism
from utils import ena_client,utils
from services import taxon_service
from flask import current_app as app


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
        species = lineage[0]
        print(species)
        tolid = ena_client.get_tolid(taxid)
        taxon_lineage = taxon_service.create_taxons_from_lineage(lineage)
        taxon_list = [dict(taxid=tax.taxid,rank=tax.rank,name=tax.name) for tax in taxon_lineage]
        insdc_common_name = species['commonName'] if 'commonName' in species.keys() else ''
        organism = Organism(taxid = taxid, insdc_common_name=insdc_common_name,organism= species['scientificName'], taxon_lineage = taxon_lineage, ordered_lineage=taxon_list, tolid_prefix=tolid).save()
        taxon_service.leaves_counter(taxon_lineage)
    if common_names and len(common_names.split('|')) > 0:
        names_arr = common_names.split('|')
        if len(organism.common_name) > 0:
            names_arr = [name for name in names_arr if name not in organism.common_name]
        organism.modify(push_all__common_name=names_arr)
    return organism

# def update_organism_names(names):

def delete_organisms(taxids):
    organisms_to_delete = Organism.objects(taxid__in=taxids)
    app.logger.info(organisms_to_delete.to_json())
    deleted_organisms=list()
    for organism in organisms_to_delete:
        app.logger.info(organism.organism)
        tax_lineage = organism.taxon_lineage
        SecondaryOrganism.objects(taxid=organism.taxid).delete()
        if len(organism.experiments)>0:
            Experiment.objects(id__in=[exp.id for exp in organism.experiments]).delete()
        if len(organism.assemblies)>0:
            Assembly.objects(id__in=[ass.id for ass in organism.assemblies]).delete()
        if organism.image:
            organism.image.delete()
        name = organism.organism
        organism.delete()
        taxon_service.delete_taxons(tax_lineage)
        deleted_organisms.append(name)
    return deleted_organisms
