from datetime import datetime
from connect_to_db import connect_to_db, disconnect_from_db
import os
from db.models import Assembly,Organism,BioSample,Chromosome
from helpers import assembly_helper,biosample_helper,taxonomy_helper, utils

DATASETS = '/ncbi/datasets'
PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')
SEQUENCE_REPORT_ARGS = ['--report', 'sequence', '--assembly-level','chromosome,complete']





   

"""
Use NCBI datasets to retrieve all the assemblies under a bioproject accession

STEPS:
    1) retrieve assemblies from datasets
    2) get_ne
retrieve assemblies from ncbi
    get taxids
    get biosamples
retrieve sequences from ncbi and get new sequences
"""

def import_assemblies(accession):

    print(f'GETTING NCBI ASSEMBLIES FOR BIOPROJECT: {accession}')

    get_all_assemblies_cmd = [DATASETS, 'summary', 'genome','accession', accession]
    ncbi_assemblies = utils.get_data_from_ncbi_datasets(get_all_assemblies_cmd)['reports']
    ncbi_accessions = [assembly['accession'] for assembly in ncbi_assemblies]
    db_accessions = utils.get_objects_by_scalar_id(Assembly,'accession',dict(accession__in=ncbi_accessions))
    new_assemblies=[assembly for assembly in ncbi_assemblies if not assembly['accession'] in db_accessions]

    if not new_assemblies:
        print('NO NEW ASSEMBLIES')
        return
    print(f'Found a total of {len(new_assemblies)} new assemblies')

    assemblies_to_save=[assembly_helper.parse_ncbi_assembly(new_assembly) for new_assembly in new_assemblies]
    
    #retrieve chromosomes 
    chromosome_dataset = utils.get_data_from_ncbi_datasets(get_all_assemblies_cmd+ SEQUENCE_REPORT_ARGS)['reports']
    chromosomes_assembly_map = assembly_helper.parse_chromosomes_from_ncbi_sequence_report(chromosome_dataset)
    print(f'FOUND A TOTAL OF {len(chromosomes_assembly_map.keys())} assemblies with chromosomes')
    
    if chromosomes_assembly_map.keys():
        flatten_chromosomes = [sequence for sequences_list in chromosomes_assembly_map.values() for sequence in sequences_list]
        utils.insert_data(Chromosome,flatten_chromosomes)

        for assembly_to_save in assemblies_to_save:
            if assembly_to_save.accession in chromosomes_assembly_map.keys():
                assemblies_to_save.chromosomes = [chr.accession_version for chr in chromosomes_assembly_map.get(assemblies_to_save.accession)]

    print('SAVING ASSEMBLIES')
    saved_assemblies = utils.insert_data(Assembly,assemblies_to_save)
    print(f'ASSEMBLY {len(saved_assemblies)} SAVED')

    related_samples=[]
    related_taxids=set()
    for saved_assembly in saved_assemblies:

        related_samples.append(saved_assembly.sample_accession)
        #if no errors save assemblies
        related_taxids.add(saved_assemblies.taxid)

    new_biosamples_collection_map = biosample_helper.get_biosamples_from_ncbi_assembly_model(new_assemblies)
    
    biosamples_to_save = [biosample_helper.parse_biosample_from_ncbi_datasets_assemblies(new_biosamples_collection_map[key]) for key in new_biosamples_collection_map.keys()]
    # save biosamples here
    saved_biosamples = utils.insert_data(BioSample,biosamples_to_save)

    biosample_helper.add_assembly_to_biosample(saved_assemblies, related_samples)

    new_taxids = taxonomy_helper.get_new_taxids(list(related_taxids))
    organisms_lineage_tuples = taxonomy_helper.get_taxons_from_ena(list(new_taxids))
    
    utils.insert_data(Organism, [t[0] for t in organisms_lineage_tuples] )

    taxonomy_helper.update_organisms(saved_biosamples,'add_to_set__biosamples')
    taxonomy_helper.update_organisms(saved_assemblies, 'add_to_set__assemblies')


    for lineage in [t[1] for t in organisms_lineage_tuples]:
        taxon_lineage = taxonomy_helper.create_taxons_from_lineage(lineage)
        for taxon in taxon_lineage:
            taxon.update(leaves=Organism.objects(taxon_lineage=taxon.taxid, taxid__ne=taxon.taxid).count())

    print(f'SAVED {len(saved_assemblies)} NEW ASSEMBLIES')



if __name__ == "__main__":
    connect_to_db()
    print(f"Running import_assemblies at {datetime.now()}")
    import_assemblies(PROJECT_ACCESSION)

    disconnect_from_db()


