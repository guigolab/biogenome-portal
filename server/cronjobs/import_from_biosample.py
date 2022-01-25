import requests
from db.models import Assembly, Organism, SecondaryOrganism, TaxonNode, Experiment, TrackStatus
from lxml import etree

# # # organism_terms = ['WHOLE ORGANISM', 'MYCELIUM', 'WHOLE PLANT']
RANKS = ['root','superkingdom','kingdom','phylum','subphylum','class','order','family','genus','species','subspecies']

##ENA CHECKLIST ERC000053 TO DB MODEL
CHECKLIST_PARSER = {
    'organism part' : 'organism_part', 
    'lifestage' : 'lifestage', 
    'project name' : 'project_name' ,
    'tolid' : 'tolid' ,
    'barcoding center' : 'barcoding_center',
    'collected_by' : 'collected_by',
    'collection date' : 'collection_date',
    'geographic location (country and/or sea)':'geographic_location_country',
    'geographic location (latitude)':'geographic_location_latitude',
    'geographic location (longitude)':'geographic_location_longitude',
    'geographic location (region and locality)': 'geographic_location_region_and_locality',
    'identified_by' : 'identified_by',
    'geographic location (depth)': 'geographic_location_depth'  ,
    'geographic location (elevation)': 'geographic_location_elevation'  ,
    'habitat' : 'habitat',
    'identifier_affiliation' : 'identifier_affiliation',
    'original collection date' :  'original_collection_date',
    'original geographic location':'original_geographic_location' ,
    'sample derived from':'sample_derived_from' ,
    'sample same as': 'sample_same_as' ,
    'sample symbiont of':'sample_symbiont_of' ,
    'sample coordinator':'sample_coordinator' ,
    'sample coordinator affiliation':'sample_coordinator_affiliation' ,
    'sex' : 'sex',
    'relationship' : 'relationship',
    'symbiont' : 'symbiont',
    'collecting institution' : 'collecting_institution',
    'GAL' : 'GAL',
    'specimen_voucher' : 'specimen_voucher',
    'specimen_id' : 'specimen_id',
    'GAL_sample_id' : 'GAL_sample_id',
    'culture_or_strain_id' : 'culture_or_strain_id'
    }

#import biosamples
#track status
#FIX: passing a list or a single project??
def import_from_biosamples(PROJECTS):
    samples = list()
    for project in PROJECTS:
        response = requests.get(
        f"https://www.ebi.ac.uk/biosamples/samples?size=100000&"
        f"filter=attr%3Aproject%20name%3A{project}").json()
        samples.extend(response['_embedded']['samples'])
    if len(samples) != 0 and len(samples) == len(SecondaryOrganism.objects()):
        return
    for sample in samples:
        accession = sample['accession']
        sample = SecondaryOrganism.objects(accession = accession).first()
        if sample:
            update_sample(sample,accession)
        else:
            parse_record(sample['characteristics'],accession,str(sample['taxId']))
    append_specimens(SecondaryOrganism.objects())

def update_sample(sample,accession):
    organism = Organism.objects(taxid = str(sample.taxonId)).first()
    experiments = get_reads(accession)
    assemblies = parse_assemblies(accession)
    if len(sample.experiments) != len(experiments):
        new_experiments = list(set(experiments) - set(sample.experiments))
        for ex in new_experiments:
            sample.experiments.append(ex)
            organism.experiments.append(ex)
    if len(sample.assemblies) != len(assemblies):
        new_assemblies = list(set(assemblies) - set(sample.assemblies))
        for ass in new_assemblies:
            sample.assemblies.append(ass)
            organism.assemblies.append(ass)
    sample.save()
    organism.save()


def parse_record(sample, accession, taxon_id):
    organism = Organism.objects(taxid=taxon_id).first() if Organism.objects(taxid=taxon_id).first() else get_organism(taxon_id)
    if not organism:
        return ##skip sample creation if taxon is not present in ENA
    secondary_organism = SecondaryOrganism(accession = accession, taxonId = taxon_id)
    for key in sample.keys():
        if key in CHECKLIST_PARSER.keys():
            secondary_organism[CHECKLIST_PARSER[key]] = {}
            secondary_organism[CHECKLIST_PARSER[key]]['text'] = sample[key][0]['text']
            if 'unit' in sample[key][0].keys():
                secondary_organism[CHECKLIST_PARSER[key]]['unit'] = sample[key][0]['unit']
        # else:
        #     secondary_organism.custom_fields[key] = sample[key][0]['text']
    experiments = get_reads(accession)
    assemblies = parse_assemblies(accession)
    if len(assemblies) > 0:
        for assembly in assemblies:
            assembly['sample_accession'] = accession
            ass = Assembly(**assembly).save()
            secondary_organism.assemblies.append(ass)
            organism.assemblies.append(ass)
            organism.trackingSystem = TrackStatus.ASSEMBLIES
    if len(experiments) > 0:
        for experiment in experiments:
            exp = Experiment(**experiment).save()
            secondary_organism.experiments.append(exp)
            organism.experiments.append(exp)
            organism.trackingSystem = TrackStatus.MAP_READS
    secondary_organism.save()
    if not secondary_organism.sample_derived_from:
        organism.records.append(secondary_organism)
    organism.save()

def parse_assemblies(accession):
    assemblies_data = requests.get(f"https://www.ebi.ac.uk/ena/portal/api/"
                                   f"links/sample?format=json"
                                   f"&accession={accession}&result=assembly"
                                   f"&offset=0&limit=1000")
    if assemblies_data.status_code != 200:
        return list()
    else:
        return assemblies_data.json()


def get_reads(accession):
    experiments_data = requests.get(f'https://www.ebi.ac.uk/ena/portal/'
                                        f'api/filereport?result=read_run'
                                        f'&accession={accession}'
                                        f'&offset=0&limit=1000&format=json'
                                        f'&fields=study_accession,'
                                        f'secondary_study_accession,'
                                        f'sample_accession,'
                                        f'secondary_sample_accession,'
                                        f'experiment_accession,run_accession,'
                                        f'submission_accession,tax_id,'
                                        f'scientific_name,instrument_platform,'
                                        f'instrument_model,library_name,'
                                        f'nominal_length,library_layout,'
                                        f'library_strategy,library_source,'
                                        f'library_selection,read_count,'
                                        f'base_count,center_name,first_public,'
                                        f'last_updated,experiment_title,'
                                        f'study_title,study_alias,'
                                        f'experiment_alias,run_alias,'
                                        f'fastq_bytes,fastq_md5,fastq_ftp,'
                                        f'fastq_aspera,fastq_galaxy,'
                                        f'submitted_bytes,submitted_md5,'
                                        f'submitted_ftp,submitted_aspera,'
                                        f'submitted_galaxy,submitted_format,'
                                        f'sra_bytes,sra_md5,sra_ftp,sra_aspera,'
                                        f'sra_galaxy,cram_index_ftp,'
                                        f'cram_index_aspera,cram_index_galaxy,'
                                        f'sample_alias,broker_name,'
                                        f'sample_title,nominal_sdev,'
                                        f'first_created')
    if experiments_data.status_code != 200:
        return list()
    else:
        return experiments_data.json()


def append_specimens(samples):
    print('APPENDING SPECIMENS TO SAMPLE')
    for sample in samples:
        if 'text' in sample.sample_derived_from.keys() and SecondaryOrganism.objects(accession=sample.sample_derived_from['text']).first():
            derived_from = sample.sample_derived_from['text']
            parent_sample = SecondaryOrganism.objects(accession=derived_from).first()
            if not any (sample.id == child_specimen.id for child_specimen in parent_sample.specimens):
                parent_sample.specimens.append(sample)
                parent_sample.save()
            else:
                continue
        else:
            continue            

def get_organism(taxon_id):
    response = requests.get(f"https://www.ebi.ac.uk/ena/browser/api/xml/{taxon_id}?download=false") ## 
    if response.status_code == 200:
        root = etree.fromstring(response.content)
        species = root[0].attrib
        lineage = []
        for taxon in root[0]:
            if taxon.tag == 'lineage':
                for node in taxon:
                    lineage.append(node.attrib)
        lineage.insert(0,species)
        taxon_lineage = create_taxons(lineage)
        create_children(taxon_lineage)
        organism = Organism(organism=species['scientificName'],taxid=species['taxId'],taxon_lineage=taxon_lineage).save()
        leaves_counter(organism.taxon_lineage)
        return organism
    else:
        return None


def create_taxons(lineage):
    taxon_lineage = []
    for node in lineage:
        if ('rank' in node.keys() and node['rank'] in RANKS) or node['taxId'] == 1:
            taxon_node = TaxonNode.objects(taxid=node['taxId']).first()
            if not taxon_node:
                taxon_node = TaxonNode(taxid=node['taxId'], name=node['scientificName'], rank=node['rank']).save()
            taxon_lineage.append(taxon_node)
    return taxon_lineage

def create_children(lineage):
    for index in range(len(lineage)-1):
        child_taxon = lineage[index]
        father_taxon = lineage[index + 1]
        if not any(child_node.id == child_taxon.id for child_node in father_taxon.children):
            father_taxon.children.append(child_taxon)
            father_taxon.save()
        else:
            continue

def leaves_counter(lineage_list):
    for node in lineage_list:
        tax_node = node.fetch()
        tax_node.leaves=count_species(tax_node)
        tax_node.save()

def count_species(tax_node):
    leaves = 0
    if not tax_node:
        return 0
    elif len(tax_node.children) == 0:
        return 1
    else:
        for child in [lazy_ref.fetch() for lazy_ref in tax_node.children]:
            leaves += count_species(child)
        return leaves
