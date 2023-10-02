# from . import db
import datetime
import os
from .enums import INSDCStatus, GoaTStatus, TargetListStatus, PublicationSource, BrokerSource, CronJobStatus, Roles
import mongoengine as db

def handler(event):
    """Signal decorator to allow use of callback functions as class decorators."""
    def decorator(fn):
        def apply(cls):
            event.connect(fn, sender=cls)
            return cls
        fn.apply = apply
        return fn
    return decorator

class TaxonNode(db.Document):
    children = db.ListField(db.StringField()) #stores taxids
    name = db.StringField(required=True)
    taxid = db.StringField(required= True,unique=True)
    rank = db.StringField()
    leaves = db.IntField()
    meta = {
        'indexes': [
            'taxid'
        ]
    }

@handler(db.pre_save)
def update_organism_status(sender, document, **kwargs):
    print(f'UPDATING ORGANISM STATUS {document.scientific_name}')
    if os.getenv('PROJECT_ACCESSION'):
        if document.assemblies:
            document.insdc_status= INSDCStatus.ASSEMBLIES
            document.goat_status=GoaTStatus.INSDC_SUBMITTED
        elif document.experiments:
            document.insdc_status= INSDCStatus.READS
            document.goat_status=GoaTStatus.IN_ASSEMBLY
        elif document.biosamples:
            document.insdc_status=INSDCStatus.SAMPLE
            document.goat_status = GoaTStatus.SAMPLE_ACQUIRED
        elif document.local_samples:
            document.insdc_status=None
            document.goat_status = GoaTStatus.SAMPLE_COLLECTED
        if document.publications:
            document.goat_status = GoaTStatus.PUBLICATION_AVAILABLE

class Experiment(db.Document):
    sample_accession= db.StringField()
    experiment_accession= db.StringField(unique=True)
    instrument_platform = db.StringField()
    instrument_model = db.StringField()
    taxid = db.StringField(required=True)
    scientific_name= db.StringField()
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    metadata=db.DictField()
    meta = {
        'indexes': ['experiment_accession']
    }

class Assembly(db.Document):
    accession = db.StringField(unique=True)
    assembly_name=db.StringField()
    scientific_name= db.StringField()
    taxid = db.StringField(required=True)
    sample_accession=db.StringField()
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    metadata=db.DictField()
    chromosomes=db.ListField(db.StringField())
    meta = {
        'indexes': ['accession']
    }


class Chromosome(db.Document):
    accession_version = db.StringField(required=True,unique=True)
    metadata=db.DictField()

class BioProject(db.Document):
    accession = db.StringField(required=True, unique=True)
    title = db.StringField()
    children = db.ListField(db.StringField())
    leaves = db.IntField()
    meta = {
        'indexes': ['accession']
    }

class SampleCoordinates(db.Document):
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    sample_accession = db.StringField(required=True, unique=True)
    is_local_sample = db.BooleanField(default=False)
    coordinates = db.PointField()
    image = db.URLField()
    meta = {
        'indexes': ['sample_accession','taxid']
    }

class LocalSample(db.Document):
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    local_id = db.StringField(required=True,unique=True)
    last_check = db.DateTimeField()
    location = db.PointField() ##list of longitude, latitude tuples: as it can contain one or more tuples it is not a valid geojson 
    country=db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    valid = db.BooleanField()
    broker=db.EnumField(BrokerSource, default=BrokerSource.LOCAL)
    user=db.StringField()
    metadata=db.DictField()
    meta = {
        'indexes': [
            'local_id'
        ],
        'strict': False
    }

class BioSample(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    accession = db.StringField(required=True,unique=True)
    collection_date=db.StringField() #TODO: add job to parse collection date form metadata 
    location = db.PointField()
    bioprojects = db.ListField(db.StringField())
    sub_samples = db.ListField(db.StringField())
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    last_check = db.DateTimeField()
    metadata=db.DictField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    meta = {
        'indexes': [
            'accession'
        ],
        'strict': False
    }

class GenomeAnnotation(db.Document):
    assembly_accession = db.StringField(required=True)
    assembly_name = db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    name = db.StringField(required=True,unique=True)
    gff_gz_location = db.URLField(required=True)
    tab_index_location = db.URLField(required=True)
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    metadata=db.DictField()
    user=db.StringField()
    external=db.BooleanField(default=True)
   
@handler(db.post_delete)
def delete_related_data( sender, document ):
    taxid = document.taxid
    Assembly.objects(taxid=taxid).delete()
    GenomeAnnotation.objects(taxid=taxid).delete()
    Experiment.objects(taxid=taxid).delete()
    LocalSample.objects(taxid=taxid).delete()
    BioSample.objects(taxid=taxid).delete()
    OrganismPublication.objects(taxid=taxid).delete()
    Publication.objects(taxid=taxid).delete()
    SampleCoordinates.objects(taxid=taxid).delete()
    taxons = TaxonNode.objects(taxid__in=document.taxon_lineage)
    for node in taxons:
        node.leaves=node.leaves - 1
        if node.leaves <= 0:
            TaxonNode.objects(children=node.taxid).update_one(pull__children=node.taxid)
            node.delete()
        else:
            node.save()

class CommonName(db.EmbeddedDocument):
    value=db.StringField()
    lang=db.StringField()
    locality=db.StringField()

class Publication(db.EmbeddedDocument):
    source = db.EnumField(PublicationSource)
    id = db.StringField()

class OrganismPublication(db.Document):
    source = db.EnumField(PublicationSource)
    publication_id = db.StringField(required=True, unique=True)
    taxid = db.StringField(required=True, unique=True)
    title = db.StringField()
    description = db.StringField()
    metadata = db.DictField()

@delete_related_data.apply
@update_organism_status.apply
class Organism(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    publications = db.ListField(db.EmbeddedDocumentField(Publication))
    related_publications = db.ListField(db.StringField())
    metadata = db.DictField()
    tolid_prefix = db.StringField()
    links = db.ListField(db.URLField())
    common_names= db.ListField(db.EmbeddedDocumentField(CommonName))
    bioprojects = db.ListField(db.StringField())
    annotations = db.ListField(db.StringField())
    locations = db.ListField(db.ListField(db.FloatField()))
    countries = db.ListField(db.StringField())
    insdc_common_name = db.StringField()
    local_samples = db.ListField(db.StringField())
    biosamples = db.ListField(db.StringField())
    scientific_name = db.StringField(required=True,unique=True)
    taxid = db.StringField(required= True,unique=True)
    image = db.URLField()
    image_urls = db.ListField(db.URLField())
    taxon_lineage = db.ListField(db.StringField())
    insdc_status = db.EnumField(INSDCStatus)
    goat_status = db.EnumField(GoaTStatus)
    target_list_status = db.EnumField(TargetListStatus)
    meta = {
        'indexes': [
            'scientific_name',
            'insdc_common_name',
            'tolid_prefix',
            'taxid'
        ],
        'strict': False
    }

class CronJob(db.Document):
    status = db.EnumField(CronJobStatus, required=True)
    cronjob_type = db.StringField(required=True,unique=True)

class BioGenomeUser(db.Document):
    name=db.StringField(unique=True,required=True)
    password=db.StringField(required=True)
    role=db.EnumField(Roles, required=True)