from db.models import Assembly

def parse_assembly_from_ncbi_datasets(assembly):
    organism = assembly.get('organism', {})
    assembly_info = assembly.get('assembly_info', {})
    assembly_to_save={
        'accession': assembly.get('accession'),
        'assembly_name': assembly_info.get('assembly_name'),
        'scientific_name': organism.get('organism_name'),
        'taxid': str(organism.get('tax_id')),
        'sample_accession': assembly_info.get('biosample', {}).get('accession'),
    }
    ## save the assembly as it is
    assembly_to_save['metadata'] = {
        **assembly
    }
    
    return Assembly(**assembly_to_save)
