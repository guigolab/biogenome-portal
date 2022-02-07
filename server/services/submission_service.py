from db.models import SecondaryOrganism, Organism
from utils import ena_client, utils
from services import taxon_service,sample_service

# create sample and related data
def create_data(data,localSource=False):
    # organism = get_organism(data['taxid'],data['name'])
    # if not organism :
    #     return 
    metadata = data['metadata']
    sample = sample_service.create_sample(metadata)
    print(sample)

    # else:
def create_sample(metadata):
    print(metadata)
    sample_dict = utils.parse_sample_metadata(dict(),metadata)
    print(sample_dict)
    # sample = SecondaryOrganism(**metadata)
    # sample.save()

#get organism or create it
def get_organism(taxid, species_name):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
       #create taxons
       taxon_lineage = create_taxons(taxid)
       organism = Organism(taxid = taxid, organism= species_name, taxon_lineage = taxon_lineage).save()
    return organism

#create taxon data
def create_taxons(taxid):
    taxon = ena_client.get_taxon(taxid)
    lineage = utils.parse_taxon(taxon)
    taxon_lineage = taxon_service.create_taxons_from_lineage(lineage)
    taxon_service.leaves_counter(taxon_lineage)
    return taxon_lineage