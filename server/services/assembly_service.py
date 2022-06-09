from curses import meta
from db.models import Assembly,Chromosome

def create_assembly(assembly, organism, sample):
    ass_metadata=dict()
    for key in assembly.keys():
        if key not in ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']:
            ass_metadata[key] = assembly[key]
    ass_obj = Assembly(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=organism.scientific_name, sample_accession= sample.accession,metadata=ass_metadata).save()
    organism.modify(add_to_set__assemblies=ass_obj.accession)
    sample.modify(add_to_set__assemblies=ass_obj.accession)
    return ass_obj

def create_chromosomes(assembly,chromosomes):
    for chr in chromosomes:
        if not 'accession_version' in chr.keys():
            continue
        chr_obj = Chromosome.objects(accession_version = chr['accession_version']).first()
        if not chr_obj:
            metadata=dict()
            for k in chr.keys():
                if k != 'accession_version':
                    metadata[k] = chr[k]
            chr_obj = Chromosome(accession_version=chr['accession_version'], metadata=metadata).save()
        assembly.modify(add_to_set__chromosomes=chr_obj.accession_version)
