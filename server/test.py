import requests

def get_reads(accession):
    experiments_data = requests.get(f'https://www.ebi.ac.uk/ena/portal/'
                                        f'api/filereport?result=read_run'
                                        f'&accession={accession}'
                                        f'&limit=0&format=json'
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
    return experiments_data.json()
    

def get_reads_link_from_sample_accession(accession):
    experiments_data = requests.get(f"https://www.ebi.ac.uk/ena/portal/api/links/sample?accession={accession}&result=read_run&limit=1000&format=json")
    if experiments_data.status_code != 200:
        return list()
    return experiments_data.json()
# reads = get_reads('PRJEB40665')
# print(reads[0])


sample = {'name': 'SAMD00098925', 
          'accession': 'SAMD00098925', 
          'domain': 'self.BiosampleImportNCBI', 
          'taxId': 259920, 
          'status': 'PUBLIC', 
          'release': '2018-08-01T00:00:00Z', 
          'update': '2022-11-02T02:33:27.525Z', 
          'submitted': '2018-07-31T19:05:14.380Z', 
          'characteristics': 
          {'External Id': [{'text': 'SAMD00098925', 'tag': 'Namespace:BioSample'}],
            'INSDC center name': [{'text': 'Phyloinformatics Unit, Division of Bio-Function Dynamics Imaging, Center for Life Science Technologies, RIKEN'}], 
            'INSDC first public': [{'text': '2018-08-01T00:00:00Z'}], 
            'INSDC last update': [{'text': '2022-10-30T14:26:00.123Z'}],
              'INSDC secondary accession': [{'text': 'DRS072513'}], 
              'INSDC status': [{'text': 'live'}], 
              'NCBI submission model': [{'text': 'Generic'}], 
              'NCBI submission package': [{'text': 'Generic.1.0'}],
                'SRA accession': [{'text': 'DRS072513'}], 
                'description': [{'text': 'used for transcriptome sequencing'}],
                  'dev stage': [{'text': 'adult', 'ontologyTerms': ['http://www.ebi.ac.uk/efo/EFO_0001272'], 'tag': 'attribute'}],
                   
                    'isolate': [{'text': 'Individual#14', 'tag': 'attribute'}], 
                    'organism': [{'text': 'Rhincodon typus', 'ontologyTerms': ['http://purl.obolibrary.org/obo/NCBITaxon_259920']}],
                      'sample name': [{'text': 'RNA_chu_No4_Rtypus', 'tag': 'attribute'}], 
                      'sex': [{'text': 'male', 'ontologyTerms': ['http://purl.obolibrary.org/obo/PATO_0000384'], 'tag': 'attribute'}], 
                      'tissue type': [{'text': 'blood cells', 'ontologyTerms': ['http://purl.obolibrary.org/obo/CL_0000081'], 'tag': 'attribute'}], 
                      'title': [{'text': 'whale shark adult blood cells No4'}]}, 
                      'externalReferences': [{'url': 'https://www.ebi.ac.uk/ena/data/view/SAMD00098925', 'duo': []}],
                        'submittedVia': 'PIPELINE_IMPORT', 'create': '2018-07-31T19:05:14.380Z', '_links': {'self': {'href': 'https://www.ebi.ac.uk/biosamples/samples/SAMD00098925'}, 'curationDomain': {'href': 'https://www.ebi.ac.uk/biosamples/samples/SAMD00098925{?curationdomain}', 'templated': True}, 'curationLinks': {'href': 'https://www.ebi.ac.uk/biosamples/samples/SAMD00098925/curationlinks'}, 'curationLink': {'href': 'https://www.ebi.ac.uk/biosamples/samples/SAMD00098925/curationlinks/{hash}', 'templated': True}, 'structuredData': {'href': 'https://www.ebi.ac.uk/biosamples/structureddata/SAMD00098925'}}}





URL = "https://www.ebi.ac.uk/ena/browser/api/xml"


result = requests.post(URL, data=dict(accessions=['SAMEA7520667', 'SAMEA7520752']))

print(result.content)