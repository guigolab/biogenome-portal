from db.models import BioSample, Experiment, Organism, Read
from errors import NotFound
from ..biosample import biosamples_service
from ..organism import organisms_service
from ..utils import ena_client, data_helper
from mongoengine.queryset.visitor import Q
from datetime import datetime
from collections import defaultdict


FIELDS_TO_EXCLUDE = ['id', 'created']

def get_reads(args):
    
    filter = get_filter(args.get('filter'))
    selected_fields = [v for k, v in args.items(multi=True) if k.startswith('fields[]')]
    if not selected_fields:
        selected_fields = ['experiment_accession', 'taxid', "scientific_name", "sample_accession"]
    return data_helper.get_items(args, 
                                 Experiment, 
                                 FIELDS_TO_EXCLUDE, 
                                 filter,
                                 selected_fields)

def get_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(metadata__experiment_title__icontains=filter)) | (Q(experiment_accession__iexact=filter)) | (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
    return None

def parse_ena_reads(accession):
    reads = ena_client.get_reads(accession)
    seen_accessions = set()
    parsed_reads = []
    for read in reads:
        run_accession = read.get('run_accession')
        if run_accession in seen_accessions:
            continue
        seen_accessions.add(run_accession)
        experiment_accession = read.get('experiment_accession')
        run_metadata = {k: v for k, v in read.items() if k != 'run_accession'}
        parsed_reads.append(Read(run_accession=run_accession, experiment_accession=experiment_accession,metadata=run_metadata))
    return parsed_reads

def map_experiments_from_reads(reads):
    seen_experiments = set()
    experiments = list()
    for read in reads:
        experiment_accession = read.experiment_accession
        if experiment_accession in seen_experiments:
            continue
        experiment_to_save = dict(experiment_accession=experiment_accession)
        for f in ['sample_accession', 'instrument_model', 'instrument_platform']:
            experiment_to_save[f] = read.metadata.get(f)
        experiment_to_save['taxid'] = read.metadata.get('tax_id')
        metadata = {k:v for k,v in read.metadata.items() if k in ['scientific_name', 'experiment_title','study_title', 'center_name','first_created']}
        experiment_to_save['metadata'] = metadata
        seen_experiments.add(experiment_accession)
        experiments.append(Experiment(**experiment_to_save))
    return experiments

def create_experiment_from_accession(accession):
    existing_experiment = Experiment.objects(experiment_accession=accession).first()
    if existing_experiment:
        return f"{accession} already exists", 400

    reads = parse_ena_reads(accession)
    if not reads:
        return f"Experiment with {accession} not found in INSDC", 400
    
    experiment_to_save = map_experiments_from_reads(reads)[0]

    organism_obj = organisms_service.get_or_create_organism(experiment_to_save['taxid'])
    if not organism_obj:
        return f"Organism with taxid: {experiment_to_save['taxid']} not found in INSDC", 400
    #create experiment
    Read.objects.insert(reads)
    experiment_to_save.save()

    sample_accession = experiment_to_save.sample_accession

    biosamples_service.create_biosample_from_accession(sample_accession)

    return f"Experiment {accession} correctly saved", 201

def create_experiments_from_biosample_accession(accession):
    biosample = BioSample.objects(accession=accession).first()
    if not biosample:
        return f"BioSample {accession} not found, you must create it first", 400
    response = ena_client.get_reads(accession)
    if not response:
        return f'Experiments for biosample {accession} not found', 400
    reads = parse_ena_reads(accession)

    #map reads per experiment
    experiments_mapper = defaultdict(list)
    for read in reads:
        exp_accession = read.metadata.get('experiment_accession')
        experiments_mapper[exp_accession].append(read)

    for k, v in experiments_mapper.items():
        experiment = Experiment.objects(k).first()
        if experiment:
            ##check if new reads are present
            for r in v:
                if r.run_accession not in experiment.reads:
                    r.save()
                    experiment.modify(add_to_set__reads=r.run_accession)
                else:
                    continue
        else:
            experiment = map_experiments_from_reads(v)
            Read.objects.insert(v)
            experiment.save()

    return f"Experiments {','.join(experiments_mapper.keys())} successfully updated/saved", 201
    
def delete_experiment(accession):
    experiment_to_delete = Experiment.objects(experiment_accession=accession).first()
    if not experiment_to_delete:
        raise NotFound
    experiment_to_delete.delete()
    return accession


def get_experiments_by_sample(sample_accession):
    if not BioSample.objects(accession=sample_accession).first():
        raise NotFound
    return Experiment.objects(sample_accession=sample_accession).exclude('id','created')

def get_reads_by_experiment(accession):
    if not Experiment.objects(experiment_accession=accession).first():
        raise NotFound
    return Read.objects(experiment_accession=accession).exclude('id')