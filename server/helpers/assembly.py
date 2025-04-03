from clients import ncbi_client
from parsers import chromosome
from db.models import Chromosome

def save_chromosomes(assembly_obj):
    accession = assembly_obj.accession
    sequences_args = ['genome', 'accession', accession, '--report', 'sequence', '--assembly-level', 'chromosome,complete']
    sequence_report = ncbi_client.get_data_from_ncbi(sequences_args)
    if sequence_report and sequence_report.get('reports'):
        print(f"Found a total of {len(sequence_report.get('reports'))} sequences")

        chromosomes_to_save = chromosome.parse_chromosomes_from_ncbi_datasets(sequence_report.get('reports'))

        print(f"Found a total of {len(chromosomes_to_save)} chromosomes")

        if chromosomes_to_save:
            existing_chromosomes = Chromosome.objects(accession_version__in=[chr.accession_version for chr in chromosomes_to_save]).scalar('accession_version')
            new_chromosomes = [chr for chr in chromosomes_to_save if chr.accession_version and chr.accession_version not in existing_chromosomes]
            if new_chromosomes:
                print(f"Saving a total of {len(new_chromosomes)} chromosomes")
                Chromosome.objects.insert(new_chromosomes)
            assembly_obj.chromosomes = [chr.accession_version for chr in chromosomes_to_save]
    else:
        print(f"Chromosomes not found for {accession}")