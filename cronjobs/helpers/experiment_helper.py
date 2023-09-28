import time
import requests
from db.models import Experiment

def get_reads(accession):
    time.sleep(1)
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
                                        f'sra_galaxy,sample_alias,broker_name,'
                                        f'sample_title,nominal_sdev,first_created')
    
    if experiments_data.status_code != 200:
        return list()
    return experiments_data.json()


def parse_experiments_from_ena_response(experiments):
    experiments_to_save=[]
    for exp in experiments:
        print('paring experimen')
        print(exp)
        exp_metadata = dict()
        other_attributes = dict()
        for k in exp.keys():
            if k == 'tax_id':
                other_attributes['taxid'] = exp[k]
            elif k in ['instrument_model','instrument_platform','experiment_accession']:
                other_attributes[k] = exp[k]
            else:
                exp_metadata[k] = exp[k]
        ##create data here
        experiments_to_save.append(Experiment(metadata=exp_metadata, **other_attributes))
    return experiments_to_save