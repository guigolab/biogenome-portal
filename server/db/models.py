from . import db
import datetime
from enum import Enum


class GoaTStatus(Enum):
    SAMPLE_COLLECTED = 'Sample Collected'
    SAMPLE_ACQUIRED = 'Sample Acquired'
    DATA_GENERATION = 'Data Generation'
    IN_ASSEMBLY = 'In Assembly'
    INSDC_SUBMITTED = 'INSDC Submitted'
    PUBLICATION_AVAILABLE = 'Publication Available'

class INSDCStatus(Enum):
    LOCAL_SAMPLE = 'Sample Acquired'
    SAMPLE = 'Biosample Submitted'
    READS = 'Reads Submitted'
    ASSEMBLIES = 'Assemblies Submitted'
    ANN_SUBMITTED = 'Annotations Created'

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

class Experiment(db.Document):
    sample_accession= db.StringField()
    experiment_accession= db.StringField(unique=True)
    taxid= db.StringField()
    scientific_name= db.StringField()
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    metadata=db.DictField()
    meta = {
        'indexes': ['experiment_accession']
    }

class AssemblyTrack(db.EmbeddedDocument):
    name = db.StringField()
    insdc_accession = db.StringField()
    fastaLocation = db.StringField()
    faiLocation = db.StringField()
    gziLocation = db.StringField() 
    chromAlias = db.StringField()

#TODO ADD last published assembly banner
class Assembly(db.Document):
    accession = db.StringField(unique=True)
    assembly_name=db.StringField()
    scientific_name= db.StringField()
    taxid=db.StringField()
    sample_accession=db.StringField()
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    metadata=db.DictField()
    chromosomes=db.ListField(db.StringField())
    track = db.EmbeddedDocumentField(AssemblyTrack)
    meta = {
        'indexes': ['accession']
    }

class Chromosome(db.Document):
    accession_version = db.StringField(required=True,unique=True)
    metadata=db.DictField()

class Geometry(db.EmbeddedDocument):
    type=db.StringField(default='Point')
    coordinates=db.ListField(db.StringField())
    meta = {
        'indexes': [
            'coordinates',
        ]
    }

class BioProject(db.Document):
    accession = db.StringField(required=True, unique=True)
    title = db.StringField()
    parents = db.ListField(db.StringField())
    meta = {
        'indexes': ['accession']
    }

class SampleSubmitter(db.Document):
    name=db.StringField()
    password=db.StringField()

class LocalSample(db.Document):
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    local_id = db.StringField(required=True,unique=True)
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    last_check = db.DateTimeField()
    latitude=db.StringField()
    longitude=db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    valid = db.BooleanField()
    metadata=db.DictField()
    meta = {
        'indexes': [
            'local_id'
        ]
    }

class BioSample(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    accession = db.StringField()
    latitude=db.StringField()
    longitude=db.StringField()
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
        ]
    }

class Geometry(db.EmbeddedDocument):
    type=db.StringField(default='Point')
    coordinates=db.ListField(db.StringField())
    meta = {
        'indexes': [
            'coordinates',
        ]
    }

#TODO fix many to many relationship with species and bioprojects
class GeoCoordinates(db.Document):
    geo_location=db.StringField(required=True,unique=True)
    type=db.StringField(default='Feature')
    properties = db.DictField() ##duplicate field 
    organisms=db.ListField(db.StringField()) ##list of taxids
    bioprojects=db.ListField(db.StringField())
    geometry = db.EmbeddedDocumentField(Geometry)
    meta = {
        'indexes': [
             'geo_location'
        ]
    }

class Annotation(db.Document):
    name = db.StringField(required=True,unique=True)
    taxid=db.StringField()
    gffGzLocation = db.StringField()
    tabIndexLocation = db.StringField()
    targetGenome = db.StringField(required=True)
    lengthTreshold = db.StringField()
    evidenceSource = db.StringField()
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    meta = {
        'indexes': [
            'name'
        ]
    }

def handler(event):
    """Signal decorator to allow use of callback functions as class decorators."""
    def decorator(fn):
        def apply(cls):
            event.connect(fn, sender=cls)
            return cls
        fn.apply = apply
        return fn
    return decorator

@handler(db.pre_save)
def update_modified(sender, document):
    if document.annotations:
        document.insdc_status= INSDCStatus.ANN_SUBMITTED
    elif document.assemblies:
        document.insdc_status= INSDCStatus.ASSEMBLIES
        document.goat_status=GoaTStatus.INSDC_SUBMITTED
    elif document.experiments:
        document.insdc_status= INSDCStatus.READS
        document.goat_status=GoaTStatus.IN_ASSEMBLY
    elif document.biosamples:
        document.insdc_status=INSDCStatus.SAMPLE
        document.goat_status = GoaTStatus.SAMPLE_COLLECTED
    else:
        document.insdc_status=INSDCStatus.LOCAL_SAMPLE
        document.goat_status = GoaTStatus.SAMPLE_ACQUIRED
    if document.publications_id:
        document.goat_status = GoaTStatus.PUBLICATION_AVAILABLE



@update_modified.apply   
class Organism(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    publications_id = db.ListField(db.StringField())
    tolid_prefix = db.StringField()
    bioprojects = db.ListField(db.StringField())
    local_names = db.ListField(db.StringField())
    annotations = db.ListField(db.StringField())
    coordinates =db.ListField(db.StringField())
    insdc_common_name = db.StringField()
    local_samples = db.ListField(db.StringField())
    biosamples = db.ListField(db.StringField())
    scientific_name = db.StringField(required=True)
    taxid = db.StringField(required= True)
    image = db.FileField()
    image_urls = db.ListField(db.StringField())
    taxon_lineage = db.ListField(db.StringField())
    insdc_status = db.EnumField(INSDCStatus)
    goat_status = db.EnumField(GoaTStatus)
    meta = {
        'indexes': [
            'scientific_name',
            'insdc_common_name',
            'taxid'
        ]
    }