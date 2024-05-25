from db.models import Read,Experiment

EXPERIMENT_FIELDS = ['experiment_title', 'library_strategy', 'center_name', 'broker_name', 'library_selection', 'first_public', 'last_updated', 'intrument_platform', 'instrument_model']

def parse_experiments_and_reads_from_ena_portal(runs):
    experiments_to_save=[]
    reads_to_save=[]

    seen_exp = set()
    seen_run = set()

    ##Avoid potential duplicates in response
    for run in runs:

        run_accession = run.get('run_accession')
        experiment_accession = run.get('experiment_accession')
        sample_accession = run.get('sample_accession')
        scientific_name = run.get('scientific_name')

        if run_accession in seen_run:
            continue
        
        read_to_parse = {
            'run_accession':run_accession,
            'experiment_accession':experiment_accession,
            'metadata': {k: v for k, v in run.items() if k != 'run_accession'}
        }

        reads_to_save.append(Read(**read_to_parse))
        seen_run.add(run_accession)

        if experiment_accession in seen_exp:
            continue
        
        exp_to_parse = {
            'taxid': run.get('tax_id'),
            'experiment_accession':experiment_accession,
            'sample_accession':sample_accession,
            'scientific_name':scientific_name,
            'metadata': {k: v for k, v in run.items() if k in EXPERIMENT_FIELDS}
        }
        experiments_to_save.append(Experiment(**exp_to_parse))
        seen_exp.add(experiment_accession)
    return experiments_to_save, reads_to_save