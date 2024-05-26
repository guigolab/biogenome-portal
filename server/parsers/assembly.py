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
    assembly_to_save['metadata'] = {
        'annotation_info': assembly.get('annotation_info'),
        'assembly_info': {k:v for k,v in assembly_info.items() if k != 'biosample'},
        'assembly_stats': assembly.get('assembly_stats'),
        'source_database': assembly.get('source_database'),
        'wsg_info': assembly.get('wsg_info')
    }
    
    return Assembly(**assembly_to_save)
