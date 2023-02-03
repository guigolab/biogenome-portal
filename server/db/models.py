from . import db
import datetime
from enum import Enum

class BrokerSource(Enum):
    LOCAL = 'local'
    COPO = 'copo'

class PublicationSource(Enum):
    DOI = 'DOI'
    PMID = 'PubMed ID'
    PMCID = 'PubMed CentralID'

class TargetListStatus(Enum):
    LONG_LIST = 'long_list'  ## Any taxa declared as a target for the project. For regional projects, this would be that the species is known to be part of the biota of a region that is the target of this particular project. For DToL this is all UKSI plus the Irish biota.
    FAMILY_REPRESENTATIVE = 'family_representative' ## The species is a family reference species for the organisation or project. Will also receive a long_list tag on GoaT.
    OTHER_PRIORITY = 'other_priority' ## This would include for example species of primary conservation interest, early phase and pilot subproject targets.

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

class Roles(Enum):
    SAMPLE_MANAGER = 'SampleManager' # samples local (through excel) and public (biosamples)
    DATA_MANAGER = 'DataManager' # crud data
    DATA_ADMIN = 'Admin' # all actions

class CronJobStatus(Enum):
    PENDING = 'PENDING'
    DONE = 'DONE'

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
    instrument_platform = db.StringField()
    instrument_model = db.StringField()
    taxid= db.StringField()
    scientific_name= db.StringField()
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    metadata=db.DictField()
    meta = {
        'indexes': ['experiment_accession']
    }


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
    children = db.ListField(db.StringField())
    leaves = db.IntField()
    meta = {
        'indexes': ['accession']
    }

class LocalSample(db.Document):
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    local_id = db.StringField(required=True,unique=True)
    last_check = db.DateTimeField()
    latitude=db.StringField()
    longitude=db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    valid = db.BooleanField()
    broker=db.EnumField(BrokerSource, default=BrokerSource.LOCAL)
    metadata=db.DictField()
    meta = {
        'indexes': [
            'local_id'
        ]
    }

class BioSample(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    accession = db.StringField(required=True,unique=True)
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
    country=db.StringField()
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

class AssemblyTrack(db.EmbeddedDocument):
    assembly_name=db.StringField()
    fasta_location = db.URLField()
    fai_location = db.URLField()
    gzi_location = db.URLField() 
    chrom_alias = db.URLField()
    
class AnnotationTrack(db.EmbeddedDocument):
    name = db.StringField()
    gff_gz_location = db.URLField()
    tab_index_location = db.URLField()

#model to store assembly and annotation tracks
class GenomeBrowserData(db.Document):
    assembly_accession = db.StringField(required=True,unique=True)
    taxid = db.StringField(required=True)
    assembly_track=db.EmbeddedDocumentField(AssemblyTrack)
    annotation_tracks = db.ListField(db.EmbeddedDocumentField(AnnotationTrack))
    meta = {
        'indexes': [
            'assembly_accession'
        ]
    }

class Country(db.Document):
    name = db.StringField(required=True,unique=True)
    id = db.StringField(required=True,unique=True)
    organism_count = db.IntField()


##external annotations
class Annotation(db.Document):
    name = db.StringField(required=True,unique=True)
    taxid=db.StringField()
    assembly_accession = db.StringField(required=True) ##assembly accession
    metadata=db.DictField()
    links = db.ListField(db.URLField())
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
def update_modified_organism(sender, document):
    if document.annotations:
        document.insdc_status= INSDCStatus.ANN_SUBMITTED
        document.goat_status=GoaTStatus.INSDC_SUBMITTED
    elif document.assemblies:
        document.insdc_status= INSDCStatus.ASSEMBLIES
        document.goat_status=GoaTStatus.INSDC_SUBMITTED
    elif document.experiments:
        document.insdc_status= INSDCStatus.READS
        document.goat_status=GoaTStatus.IN_ASSEMBLY
    elif document.biosamples:
        document.insdc_status=INSDCStatus.SAMPLE
        document.goat_status = GoaTStatus.SAMPLE_ACQUIRED
    elif document.local_samples:
        document.insdc_status=INSDCStatus.LOCAL_SAMPLE
        document.goat_status = GoaTStatus.SAMPLE_COLLECTED
    if document.publications:
        document.goat_status = GoaTStatus.PUBLICATION_AVAILABLE

class CommonName(db.EmbeddedDocument):
    value=db.StringField()
    lang=db.StringField()
    locality=db.StringField()

class Publication(db.EmbeddedDocument):
    source = db.EnumField(PublicationSource)
    id = db.StringField()

@update_modified_organism.apply   
class Organism(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    publications = db.ListField(db.EmbeddedDocumentField(Publication))
    metadata = db.DictField()
    tolid_prefix = db.StringField()
    links = db.ListField(db.URLField())
    common_names= db.ListField(db.EmbeddedDocumentField(CommonName))
    bioprojects = db.ListField(db.StringField())
    annotations = db.ListField(db.StringField())
    coordinates =db.ListField(db.StringField())
    countries = db.Listfield(db.StringField())
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
        ]
    }

class CronJob(db.Document):
    status = db.EnumField(CronJobStatus, required=True)


class BioGenomeUser(db.Document):
    name=db.StringField(unique=True,required=True)
    password=db.StringField(required=True)
    role=db.EnumField(Roles, required=True)
