from db.models import Experiment, Read
from errors import NotFound
from mongoengine.queryset.visitor import Q
from helpers import data as data_helper, organism as organism_helper, biosample as biosample_helper
from parsers import experiment as exp_parser
from clients import ebi_client


FIELDS_TO_EXCLUDE = ['id', 'created']

def get_reads(args):
    filter = get_filter(args.get('filter'))
    return data_helper.get_items(args, 
                                 Experiment, 
                                 filter,
                                 ['experiment_accession', 'taxid', "scientific_name", "sample_accession"])

def get_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(metadata__experiment_title__icontains=filter)) | (Q(experiment_accession__iexact=filter)) | (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
    return None

def get_experiment(accession):
    experiment = Experiment.objects(experiment_accession=accession).first()
    if not experiment:
        raise NotFound
    return experiment


def create_experiment_from_accession(accession):
    existing_experiment = Experiment.objects(experiment_accession=accession).first()
    if existing_experiment:
        return f"{accession} already exists", 400

    reads = ebi_client.get_reads(accession)
    if not reads:
        return f"Experiment with {accession} not found in INSDC", 400
    
    parsed_exps, parsed_reads = exp_parser.parse_experiments_and_reads_from_ena_portal(reads)

    for exp in parsed_exps:
        if exp.experiment_accession == accession:
            organism_obj = organism_helper.handle_organism(exp.taxid)
            if not organism_obj:
                return f"Organism with taxid: {exp.taxid} not found in INSDC", 400

            biosample_obj = biosample_helper.handle_biosample(exp.sample_accession)
            if not biosample_obj:
                return f"Biosample with accession: {exp.sample_accession} not found in INSDC", 400

            exp.save()
            organism_obj.save()
            data_helper.update_lineage(exp, organism_obj)

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