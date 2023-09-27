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

@handler(db.pre_save)
def set_location(sender, document, **kwargs):
    if document.location:
        return
    print('setting location of', document)
    sample_metadata = document.metadata
    lowered_keys_dict = dict()
    latitude = None
    longitude = None
    for key in sample_metadata.keys():
        low_key = key.lower()
        lowered_keys_dict[low_key] = sample_metadata[key]
    if 'lat_lon' in sample_metadata.keys():
        values = sample_metadata['lat_lon'].split(' ')
        if len(values) == 4:
            lat,lat_value,long,long_value = values
            latitude = '-'+lat if lat_value == 'S' else lat
            longitude = '-'+long if long_value == 'W' else long
    elif 'lat lon' in sample_metadata.keys():
        values = sample_metadata['lat lon'].split(' ')
        if len(values) == 4:
            lat,lat_value,long,long_value = values
            latitude = '-'+lat if lat_value == 'S' else lat
            longitude = '-'+long if long_value == 'W' else long
    elif 'geographic location (latitude)' in sample_metadata.keys() and 'geographic location (longitude)' in sample_metadata.keys():
        latitude = str(sample_metadata['geographic location (latitude)'])
        longitude = str(sample_metadata['geographic location (longitude)'])
    elif 'latitude' in lowered_keys_dict and 'longitude' in lowered_keys_dict:
        latitude = str(lowered_keys_dict['latitude'])
        longitude  = str(lowered_keys_dict['longitude'])
    elif 'decimal_latitude' in lowered_keys_dict and 'decimal_longitude' in lowered_keys_dict:
        latitude = str(lowered_keys_dict['decimal_latitude'])
        longitude  = str(lowered_keys_dict['decimal_longitude'])
    if latitude and longitude:
        try:
            if any(c.isdigit() for c in str(latitude)) and any(c.isdigit() for c in str(longitude)):
                ##replace , with .
                if ',' in latitude and ',' in longitude:
                    latitude = latitude.replace(',', '.')
                    longitude = longitude.replace(',', '.')
                if "'" in latitude and "'" in longitude:
                    latitude = latitude.replace("'", ".")
                    longitude = longitude.replace("'", ".")
                if float(latitude) >= -90.0 and float(latitude) <= 90.0 and float(longitude) >= -180.0 and float(longitude) <= 180.0:
                    lng = float(longitude)
                    lat = float(latitude)
                    document.location = [lng, lat]
        except:
            print(f'Invalid latitude:{latitude} or longitude: {longitude} for sample:{document}')

@set_location.apply
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

@set_location.apply
class BioSample(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    accession = db.StringField(required=True,unique=True)
    country=db.StringField()
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
    if document.bioprojects:
        for accession in document.bioprojects:
            bioproject = BioProject.objects(accession=accession).first()
            bioproject.leaves = bioproject.leaves -1
            if bioproject.leaves <= 0:
                bioproject.delete()
            else:
                bioproject.save()
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