from db.models import Experiment, Read
from errors import NotFound
from ..utils import ena_client
from mongoengine.queryset.visitor import Q
from utils.helpers import data as data_helper, organism as organism_helper, biosample as biosample_helper
from utils.parsers import experiment as exp_parser
from utils.clients import ebi_client


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

def get_experiment(accession):
    experiment = Experiment.objects(experiment_accession=accession).first()
    if not experiment:
        raise NotFound
    return experiment

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

    reads = ebi_client.get_reads(accession)
    if not reads:
        return f"Experiment with {accession} not found in INSDC", 400
    
    parsed_exps, parsed_reads = exp_parser.parse_experiments_and_reads_from_ena_portal(reads)

    for exp in parsed_exps:
        if exp.accession == accession:
            organism_obj = organism_helper.handle_organism(exp.taxid)
            if not organism_obj:
                return f"Organism with taxid: {exp.taxid} not found in INSDC", 400

            biosample_obj = biosample_helper.handle_biosample(exp.sample_accession)
            if not biosample_obj:
                return f"Biosample with accession: {exp.sample_accession} not found in INSDC", 400

            exp.save()
            organism_obj.save()

    if parsed_reads:
        reads_to_save = [run for run in parsed_reads if run.experiment_accession == accession]
        existing_reads = Read.objects(experiment_accession=accession).scalar('run_accession')
        filtered_reads = [read for read in reads_to_save if read.run_accession not in existing_reads]
        Read.objects.insert(filtered_reads)

    return f"Experiment {accession} correctly saved", 201

def delete_experiment(accession):
    experiment_to_delete = Experiment.objects(experiment_accession=accession).first()
    if not experiment_to_delete:
        raise NotFound
    experiment_to_delete.delete()
    return accession

def get_reads_by_experiment(accession):
    if not Experiment.objects(experiment_accession=accession).first():
        raise NotFound
    return Read.objects(experiment_accession=accession).exclude('id')