from db.models import Assembly,Chromosome
from . import utils 
import os

DATASETS = '/ncbi/datasets'
PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')
SEQUENCE_REPORT_ARGS = ['--report', 'sequence', '--assembly-level','chromosome,complete']



def parse_ncbi_assembly(assembly):
    assembly_accession = assembly['accession']    
    # Initialize metadata dictionary
    metadata = {key: value for key, value in assembly['assembly_info'].items()
                if key not in ['biosample', 'bioproject_lineage', 'assembly_name']}
    
    # Extract assembly_name
    assembly_name = assembly['assembly_info'].get('assembly_name', '')

    # Update metadata with assembly_stats and annotation_info if available
    metadata.update(assembly.get('assembly_stats', {}))
    annotation_info = assembly.get('annotation_info')
    if annotation_info:
        metadata['annotation_info'] = annotation_info

    # Create assembly_to_save dictionary
    assembly_to_save = {
        'accession': assembly_accession,
        'scientific_name': assembly['organism']['organism_name'],
        'taxid': str(assembly['organism']['tax_id']),
        'sample_accession': assembly['assembly_info']['biosample']['accession'],
        'assembly_name': assembly_name,
        'metadata': metadata
    }

    # Create an Assembly instance
    assembly_to_save = Assembly(**assembly_to_save)
        
    return assembly_to_save

"""
expects chr_name
"""
def parse_ncbi_chromosomes(chromosomes, assembly_to_save):
    chromosomes_to_save=list()
    for chr in chromosomes:
        print(chr)
        if not 'chr_name' in chr.keys():
            continue
        metadata = dict(name=chr['chr_name'], length=chr['length'], gc_count=chr['gc_count'])
        chr_data = dict(accession_version=chr['genbank_accession'],metadata=metadata)
        chromosomes_to_save.append(Chromosome(**chr_data))
        assembly_to_save.chromosomes.append(chr['chr_name'])
    return chromosomes_to_save

def parse_ncbi_sequences(ncbi_sequences, assemblies_to_save):
    chromosomes_to_save = []
    for assembly_to_save in assemblies_to_save:
        chromosomes = ncbi_sequences.get(assembly_to_save.accession)
        if not chromosomes:
            continue
        for chr in chromosomes:
            print(chr)
            metadata = dict(name=chr['chr_name'], length=chr['length'], gc_count=chr['gc_count'])
            chr_data = dict(accession_version=chr['genbank_accession'],metadata=metadata)
            chromosomes_to_save.append(Chromosome(**chr_data))
        assembly_to_save.chromosomes = [chr['genbank_accession'] for chr in chromosomes]
    return chromosomes_to_save


## return parsed chromosomes mapped by assembly accession
def parse_chromosomes_from_ncbi_sequence_report(sequences):
    sequences_by_assembly = {}
    existing_assemblies = utils.get_objects_by_scalar_id(Assembly,'accession',dict(accession__in=[seq['assembly_accession'] for seq in sequences])) 
    
    for seq in [sequence for sequence in sequences if sequence['assembly_accession'] not in existing_assemblies]:
        # Skip sequences without 'chr_name' attribute
        if all(key in seq for key in ['chr_name', 'genbank_accession']) and seq.get('role') == 'assembled-molecule' and seq.get('assigned_molecule_location_type') == 'Chromosome':
            accession = seq['assembly_accession']
            chr_name = seq['chr_name']
            length = seq['length']
            gc_count = seq.get('gc_count')
            genbank_accession = seq['genbank_accession']

            metadata = {
                'name': chr_name,
                'length': length,
                'gc_count': gc_count
            }

            sequence_obj = Chromosome(
                accession_version=genbank_accession,
                metadata=metadata
            )
            # Use setdefault to simplify code
            sequences_by_assembly.setdefault(accession, []).append(sequence_obj)

    return sequences_by_assembly

def get_new_assemblies(assemblies):
    db_accessions = utils.get_objects_by_scalar_id(Assembly,'accession',dict(accession__in=[assembly['accession'] for assembly in assemblies]))
    return [assembly for assembly in assemblies if not assembly['accession'] in db_accessions]
