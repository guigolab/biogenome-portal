
from db.models import CommonName,TaxonNode, Organism, Publication,Assembly,GenomeAnnotation,BioSample,LocalSample,Experiment
from helpers import taxonomy as taxonomy_helper, user as user_helper, organism as organism_helper, geolocation as geoloc_helper, data as data_helper
from werkzeug.exceptions import BadRequest, Conflict, NotFound
import os 

PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')

MODEL_LIST = {
    'assemblies':{'model':Assembly, 'id':'accession'},
    'annotations':{'model':GenomeAnnotation, 'id':'name'},
    'biosamples':{'model':BioSample, 'id':'accession'},
    'local_samples':{'model':LocalSample, 'id':'local_id'},
    'experiments':{'model':Experiment, 'id':'experiment_accession'},
    }

def get_organisms(args):
    return data_helper.get_items('organisms', args)

def get_organism(taxid):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
        raise NotFound(description=f"Organism {taxid} not found!")
    return organism

def get_organism_related_data(taxid, model):

    get_organism(taxid)

    if not model in MODEL_LIST.keys():
        raise BadRequest(description=f"{model} is not in {' '.join(MODEL_LIST.keys)}")
    
    mapped_model = MODEL_LIST.get(model)
    return mapped_model.get('model').objects(taxid=taxid)

def update_organism(data, taxid):
    organism = get_organism(taxid)

    organism_data = map_organism_data(data,taxid)

    organism.update(**organism_data)
    organism.save()
    
    return taxid

def create_organism(data):
    taxid = data.get('taxid')
    if not taxid:
        raise BadRequest(description="taxid is mandatory!")
    
    if Organism.objects(taxid=taxid):
        raise Conflict(description=f"An organisms with taxid {taxid} already exists")

    user = user_helper.get_current_user()
            
    organism = organism_helper.create_organism_and_related_taxons(taxid)
    if not organism:
        raise BadRequest(description=f"Organisms with taxid {taxid} not found in INSDC")
    
    organism_data = map_organism_data(data, taxid)
    organism.update(**organism_data)
    organism.save()

    if user:
        user_helper.add_species_to_datamanager([taxid], user)

    return organism.scientific_name

def map_organism_data(data,taxid):
    organism = dict()
    filtered_data = {k: v for k, v in data.items() if v}

    string_attrs = {k: v for k, v in filtered_data.items() if isinstance(v, str)}

    image = filtered_data.get('image')

    organism['image'] = image
    geoloc_helper.add_image(taxid, image)

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

#map lineage into tree structure
def map_organism_lineage(lineage):
    root_to_organism = list(reversed(lineage))
    tree={}
    root = TaxonNode.objects(taxid=root_to_organism[0]).first()
    tree = taxonomy_helper.dfs_generator(root)
    return tree


def delete_organism(taxid):
    organism_to_delete = get_organism(taxid)
    organism_to_delete.delete()
    return f"Organisms {taxid} succesfully deleted", 200
    