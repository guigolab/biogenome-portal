
from db.models import CommonName,TaxonNode, Organism, Publication,Assembly,GenomeAnnotation,BioSample,LocalSample,Experiment,BioGenomeUser
from helpers import taxonomy as taxonomy_helper, user as user_helper, organism as organism_helper, geolocation as geoloc_helper, data as data_helper
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from mongoengine.errors import ValidationError
import os 

PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')

MODEL_LIST = {
    'assemblies':{'model':Assembly, 'id':'accession'},
    'annotations':{'model':GenomeAnnotation, 'id':'name'},
    'biosamples':{'model':BioSample, 'id':'accession'},
    'local_samples':{'model':LocalSample, 'id':'local_id'},
    'experiments':{'model':Experiment, 'id':'experiment_accession'},
    }

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
        return "taxid is mandatory", 400
    taxid = str(taxid)
    if Organism.objects(taxid=taxid):
        return f"An organisms with taxid {taxid} already exists", 400

    user = user_helper.get_current_user()
            
    organism = organism_helper.create_organism_and_related_taxons(taxid)
    if not organism:
        return f"Organisms with taxid {taxid} not found in INSDC", 400
    
    organism_data = map_organism_data(data, taxid)
    try:
        organism.update(**organism_data)
        organism.save()
    except ValidationError as e:
        Organism.objects(taxid=taxid).delete()
        return f"{e}", 400
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
    organism['sequencing_type'] = filtered_data.get('sequencing_type',[])
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
    
def get_unassigned_organisms(format='json',filter=None, limit=20, offset=0):
    users_taxids = BioGenomeUser.objects().distinct('species')
    offset = int(offset)
    limit = int(limit)
    fields = [
        'scientific_name', 'taxid', 'sub_project',
        'sequencing_type', 'insdc_status', 'goat_status', 'target_list_status'
    ]
    organisms = Organism.objects(taxid__not__in=users_taxids)
    if filter:
        organisms = organisms.filter(data_helper.query_visitors.organism_query(filter))
    return data_helper.generate_response(format, fields, organisms, limit, offset)

def get_assigned_organisms(args):
    query = {**args}
    fields = [
        'scientific_name', 'taxid', 'assigned_users', 'sub_project',
        'sequencing_type', 'insdc_status', 'goat_status', 'target_list_status'
    ]
    output_format = query.pop('format', 'json')
    user_filter = query.pop('name__in', None)
    organism_filter = query.pop('filter', None)

    selected_users = user_filter.split(',') if user_filter else []
    users = BioGenomeUser.objects.only('name', 'species')

    organism_to_users = {}
    taxids = [
        species_id for user in users if user.name in selected_users 
        for species_id in user.species
    ]
    for user in users:
        for species_id in user.species:
            organism_to_users.setdefault(str(species_id), []).append(user.name)

    organism_ids = taxids if taxids else list(organism_to_users.keys())
    if organism_ids:
        query['taxid__in'] = organism_ids

    if organism_filter:
        organism_filter = data_helper.query_visitors.organism_query(organism_filter)

    # Apply pagination and query filters
    limit, offset = data_helper.get_pagination(query)
    query, q = data_helper.create_query(query, organism_filter)
    # Query the organisms
    organisms = Organism.objects(**query)

    if q:
        organisms = organisms.filter(q)

    total = organisms.count()

    # Step 5: Build Response Data
    response_data = [
        {
            "assigned_users": organism_to_users.get(str(organism.taxid), []),
            **organism.to_mongo().to_dict()
        }
        for organism in (
            organisms if output_format in ['tsv', 'jsonl'] 
            else organisms.skip(offset).limit(limit)
        )
    ]

    # Handle different output formats
    if output_format == 'tsv':
        return data_helper.create_tsv(response_data, fields).encode('utf-8'), "text/tab-separated-values"
    elif output_format == 'jsonl':
        return data_helper.generate_jsonlines(response_data), "application/jsonlines"

    # Return JSON response with pagination
    response = {
        "total": total,
        "data": response_data
    }
    return data_helper.dump_json(response), "application/json"


def get_organisms_with_user(args):
    # Build the initial query and retrieve format and filters
    query = {**args}
    fields = [
        'scientific_name', 'taxid', 'users', 'sub_project',
        'sequencing_type', 'insdc_status', 'goat_status', 'target_list_status'
    ]
    
    # Avoid overwriting built-in 'format'
    output_format = query.pop('format', 'json')
    user_filter = query.pop('user__icontains', None)
    organism_filter = query.pop('filter__icontains', None)

    # Fetch users and build species-to-user mapping
    species_to_users = {}
    if user_filter:
        users = BioGenomeUser.objects(data_helper.query_visitors.user_query(user_filter)).scalar('name', 'species')
        species_ids = {str(species) for user in users for species in user.species}
    else:
        users = BioGenomeUser.scalar.only('name', 'species')
        for user in users:
            print(user)
            for species in user.species:
                species_str = str(species)
                if species_str not in species_to_users:
                    species_to_users[species_str] = []
                species_to_users[species_str].append(user.name)

    print(species_to_users)
    # Apply organism filters if specified
    if organism_filter:
        organism_filter = data_helper.query_visitors.organism_query(organism_filter)

    # Apply pagination and query filters
    limit, offset = data_helper.get_pagination(query)
    query, q = data_helper.create_query(query, organism_filter)

    # Query the organisms
    organisms = Organism.objects(**query)
    if q:
        organisms = organisms.filter(q)
    if user_filter:
        organisms = organisms.filter(taxid__in=species_ids)

    # Cache count to avoid redundant database hits
    total_organisms = organisms.count()
    print(users)
    # Build species data
    if output_format in ['tsv', 'jsonl']:
        species_data = [
            {"assigned_users": [user.name for user in users if str(organism.taxid) in user.species], 
             **organism.to_mongo().to_dict()}
            for organism in organisms
        ]
    else:
        species_data = [
            {"assigned_users": species_to_users.get(str(organism.taxid), []), 
             **organism.to_mongo().to_dict()}
            for organism in organisms.skip(offset).limit(limit)
        ]

    # Handle different output formats
    if output_format == 'tsv':
        return data_helper.create_tsv(species_data, fields).encode('utf-8'), "text/tab-separated-values"
    elif output_format == 'jsonl':
        return data_helper.generate_jsonlines(species_data), "application/jsonlines"

    # Return JSON response with pagination
    response = {
        "total": total_organisms,
        "data": species_data
    }
    return data_helper.dump_json(response), "application/json"
def create_organism_to_delete(taxid):
    organism = get_organism(taxid)
    user = user_helper.get_current_user()
    if not user:
        raise NotFound(description='User Not Found')
    
    if organism.pending_deletion:
        raise Conflict(description=f"Request to delete {organism.scientific_name} already present")
    
    organism.modify(pending_deletion=True)
    return f"Request to delete organism {taxid} successfully sent"

def delete_organism_to_delete(taxid):
    organism = get_organism(taxid)
    organism.modify(pending_deletion=False)
    return f"request to delete organism {taxid}, successfully deleted"
