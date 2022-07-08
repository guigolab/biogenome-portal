##import data job
from services import assembly, organism, reads
from utils import ena_client
from db.models import BioSample
from mongoengine.queryset.visitor import Q
from datetime import datetime, timedelta


SAMPLE_QUERY = Q(accession__ne=None) & (Q(last_check=None) | Q(last_check__lte=datetime.now()- timedelta(days=2)))



def update_samples():
    samples = BioSample.objects(SAMPLE_QUERY)
    if not samples:
        print('NO SAMPLES TO UPDATE')
        return
    print('SAMPLES TO UPDATE: ',len(samples))
    for sample in samples:
        organism_obj = organism.get_or_create_organism(sample.taxid)
        ## check for assemblies and reads
        response = ena_client.parse_assemblies(sample.accession)
        if response:
            for ass in response:
                assembly.create_assembly_from_accession(ass['accession'])
        else:
            saved_reads = reads.create_reads_from_biosample_accession(sample.accession)
            for read in saved_reads:
                organism_obj.modify(add_to_set__experiments=read)
                sample.modify(add_to_set__experiments=read)