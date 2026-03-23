from db.model import ReadRun

def parse_read_from_ena_portal(run):

    run_accession = run.get('run_accession')
    experiment_accession = run.get('experiment_accession')
    sample_accession = run.get('sample_accession')
    scientific_name = run.get('scientific_name')
    raw_tax = run.get("tax_id")
    if raw_tax is None or not str(raw_tax).strip():
        raise ValueError("missing tax_id")
    taxid = str(raw_tax).strip()
    # ReadRun requires scientific_name; ENA may omit it on some rows
    name = (scientific_name or '').strip() or 'unknown'

    read_to_parse = {
        'run_accession': run_accession,
        'taxid': taxid,
        'experiment_accession': experiment_accession,
        'scientific_name': name,
        'sample_accession': sample_accession,
        'metadata': {k: v for k, v in run.items() if v}
    }
    read_to_save = ReadRun(**read_to_parse)
    return read_to_save