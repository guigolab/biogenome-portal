from db.models import Experiment, Read
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from helpers import data as data_helper, organism as organism_helper, biosample as biosample_helper
from parsers import experiment as exp_parser
from clients import ebi_client


def get_reads(args):
    return data_helper.get_items('experiments', args)

def get_experiment(accession):
    experiment = Experiment.objects(experiment_accession=accession).first()
    if not experiment:
        raise NotFound(description=f"Experiment {accession} not found!")
    return experiment

def create_experiment_from_accession(accession):
    existing_experiment = Experiment.objects(experiment_accession=accession).first()
    if existing_experiment:
        raise Conflict(description= f"Experiment {accession} already exists")

    reads = ebi_client.get_reads(accession)
    if not reads:
        raise BadRequest(description=f"Experiment {accession} not found in INSDC")
    
    parsed_exps, parsed_reads = exp_parser.parse_experiments_and_reads_from_ena_portal(reads)

    for exp in parsed_exps:
        if exp.experiment_accession == accession:
            organism_obj = organism_helper.handle_organism(exp.taxid)
            if not organism_obj:
                raise BadRequest(description=f"Organisms {exp.taxid} not found in INSDC")

            biosample_obj = biosample_helper.handle_biosample(exp.sample_accession)
            if not biosample_obj:
                raise BadRequest(description=f"Biosample {exp.sample_accession} not found in INSDC")

            exp.save()
            organism_obj.save()
            data_helper.update_lineage(exp, organism_obj)

    if parsed_reads:
        reads_to_save = [run for run in parsed_reads if run.experiment_accession == accession]
        existing_reads = Read.objects(experiment_accession=accession).scalar('run_accession')
        filtered_reads = [read for read in reads_to_save if read.run_accession not in existing_reads]
        Read.objects.insert(filtered_reads)

    return accession

def delete_experiment(accession):
    experiment_to_delete = get_experiment(accession)
    experiment_to_delete.delete()
    return accession

def get_reads_by_experiment(accession):
    get_experiment(accession)
    return Read.objects(experiment_accession=accession).exclude('id')