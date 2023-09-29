from datetime import datetime
from connect_to_db import connect_to_db, disconnect_from_db
import os
from db.models import Assembly,BioSample,Chromosome
from helpers import assembly_helper,biosample_helper,taxonomy_helper, utils, sample_coordinates_helper

DATASETS = '/ncbi/datasets'
PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')
SEQUENCE_REPORT_ARGS = ['--report', 'sequence', '--assembly-level','chromosome,complete']
   

"""
Use NCBI datasets to retrieve all the assemblies under a bioproject accession

"""

def import_assemblies(accession):

    print(f'GETTING NCBI ASSEMBLIES FOR BIOPROJECT: {accession}')
    get_all_assemblies_cmd = [DATASETS, 'summary', 'genome','accession', accession]
    ncbi_assemblies = utils.get_data_from_ncbi_datasets(get_all_assemblies_cmd)['reports']
    ncbi_accessions = [assembly['accession'] for assembly in ncbi_assemblies]
    db_accessions = utils.get_objects_by_scalar_id(Assembly,'accession',dict(accession__in=ncbi_accessions))
    new_assemblies=[assembly for assembly in ncbi_assemblies if not assembly['accession'] in db_accessions]
        #update biosamples and organisms with the saved assembly
    if not new_assemblies:
        print('NO NEW ASSEMBLIES')
        return
    print(f'Found a total of {len(new_assemblies)} new assemblies')
    related_samples=[]
    related_taxids=set()
    assemblies_to_save=[assembly_helper.parse_ncbi_assembly(new_assembly) for new_assembly in new_assemblies]

    for ass_to_save in assemblies_to_save:
        related_samples.append(ass_to_save.sample_accession)
        #if no errors save assemblies
        related_taxids.add(ass_to_save.taxid)

    if not taxonomy_helper.create_organisms_and_lineage(list(related_taxids)):
        print('SKIPPING JOB DUE TO ABOVE ERROR')
        return
    
    
    #retrieve chromosomes 
    chromosome_dataset = utils.get_data_from_ncbi_datasets(get_all_assemblies_cmd+ SEQUENCE_REPORT_ARGS).get('reports')
    if chromosome_dataset:
        chromosomes_assembly_map = assembly_helper.parse_chromosomes_from_ncbi_sequence_report(chromosome_dataset)
        print(f'FOUND A TOTAL OF {len(chromosomes_assembly_map.keys())} assemblies with chromosomes')
        
        flatten_chromosomes = [sequence for sequences_list in chromosomes_assembly_map.values() for sequence in sequences_list]
        unique_chr_accessions = set([chr.accession_version for chr in flatten_chromosomes])
        existing_chromosomes = utils.get_objects_by_scalar_id(Chromosome, 'accession_version',dict(accession_version__in=list(unique_chr_accessions)))
        chrs_to_save = [chr for chr in flatten_chromosomes if chr.accession_version not in existing_chromosomes]
        if chrs_to_save:
            utils.insert_data(Chromosome, chrs_to_save)

        for assembly_to_save in assemblies_to_save:
            if assembly_to_save.accession in chromosomes_assembly_map.keys():
                assembly_to_save.chromosomes = [chr.accession_version for chr in chromosomes_assembly_map.get(assembly_to_save.accession)]

    print('SAVING ASSEMBLIES')
    saved_assemblies = utils.insert_data(Assembly,assemblies_to_save)
    print(f'ASSEMBLY {len(saved_assemblies)} SAVED')


    new_biosamples_collection_map = biosample_helper.get_biosamples_from_ncbi_assembly_model(new_assemblies)
    biosamples_to_save = [biosample_helper.parse_biosample_from_ncbi_datasets_assemblies(new_biosamples_collection_map[key]) for key in new_biosamples_collection_map.keys()]
    # save biosamples here
    print(f'Found a total of {len(biosamples_to_save)} biosamples to save')

    saved_biosamples = utils.insert_data(BioSample,biosamples_to_save)

    sample_coordinates_helper.create_coordinates_from_saved_biosamples(saved_biosamples)
    print(f'Biosamples saved: {len(saved_biosamples)}')

    sample_coordinates_helper.update_countries_from_biosamples(saved_biosamples)
    biosample_helper.add_data_to_biosamples(saved_assemblies, related_samples,'push_all__assemblies','accession')


    taxonomy_helper.update_organisms(saved_biosamples,'accession','biosamples',True)
    taxonomy_helper.update_organisms(saved_assemblies, 'accession','assemblies',True)

    print(f'ALL ASSEMBLIES AND THE RELATED DATA HAVE BEEN IMPORTED')



if __name__ == "__main__":
    connect_to_db()
    print(f"Running import_assemblies at {datetime.now()}")
    import_assemblies(PROJECT_ACCESSION)
    disconnect_from_db()


