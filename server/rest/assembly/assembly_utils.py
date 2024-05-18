

def parse_assembly_from_ncbi_datasets(assembly):
    ass_data = dict(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=assembly['org']['sci_name'],taxid=assembly['org']['tax_id'])
    if assembly.get('biosample_accession'):
        ass_data['sample_accession'] = assembly.get('biosample_accession')
    ass_metadata=dict()
    for key in assembly.keys():
        if key not in ASSEMBLY_FIELDS:
            ass_metadata[key] = assembly[key]
    blobtoolkit_resp = genomehubs_client.get_blobtoolkit_id(ass_data['accession'])
    if len(blobtoolkit_resp) and 'names' in blobtoolkit_resp[0].keys() and len(blobtoolkit_resp[0]['names']):
        ass_data['blobtoolkit_id'] = blobtoolkit_resp[0]['names'][0]
    ass_obj = Assembly(metadata=ass_metadata, **ass_data)
    chromosomes = parse_chromosomes(assembly.get('chromosomes'))
    return ass_obj, chromosomes
