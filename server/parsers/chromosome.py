from db.models import Chromosome

def parse_chromosomes_from_ncbi_datasets(sequences):
    chromosomes_to_save=[]
    for sequence in sequences:
        if sequence.get('role') == 'assembled-molecule':
            chr_to_parse = {
                'accession_version':sequence.get('genbank_accession'),
                'metadata': {k:v for k,v in sequence.items() if not k == 'genbank_accession'}
            }
            chromosomes_to_save.append(Chromosome(**chr_to_parse))
    return chromosomes_to_save