from db.models import ReadRun

def parse_read_from_ena_portal(run):

    run_accession = run.get('run_accession')
    experiment_accession = run.get('experiment_accession')
    sample_accession = run.get('sample_accession')
    scientific_name = run.get('scientific_name')
    taxid = run.get('tax_id')
    # ReadRun requires scientific_name; ENA may omit it on some rows
    name = (scientific_name or '').strip() or 'unknown'

    read_to_parse = {
        'run_accession': run_accession,
        'taxid': taxid,
        'experiment_accession': experiment_accession,
        'scientific_name': name,
        'sample_accession': sample_accession,
        'metadata': {k: v for k, v in run.items()}
    }
    read_to_save = ReadRun(**read_to_parse)
    return read_to_save