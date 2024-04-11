import datetime
import os
from .enums import INSDCStatus, GoaTStatus, TargetListStatus, PublicationSource, BrokerSource, CronJobStatus, Roles
import mongoengine as db
import os

GOAT_PROJECT_NAME = os.getenv('GOAT_PROJECT_NAME')

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
def update_organism_status(sender, document, **kwargs):
    taxid = document.taxid

    #update organism links
    document.assemblies =  Assembly.objects(taxid=taxid).scalar('accession')
    document.experiments = Experiment.objects(taxid=taxid).scalar('experiment_accession')
    document.local_samples = LocalSample.objects(taxid=taxid).scalar('local_id')
    document.biosamples = BioSample.objects(taxid=taxid).scalar('accession')
    document.annotations = GenomeAnnotation.objects(taxid=taxid).scalar('name')

    #update insdc_status
    if document.assemblies:
        document.insdc_status= INSDCStatus.ASSEMBLIES
    elif document.experiments:
        document.insdc_status= INSDCStatus.READS
    elif document.biosamples:
        document.insdc_status=INSDCStatus.SAMPLE
    elif document.local_samples:
        document.insdc_status=None

    #update goat status
    if GOAT_PROJECT_NAME:
        current_goat_status=document.goat_status
        if document.assemblies:
            document.goat_status=GoaTStatus.INSDC_SUBMITTED
        elif document.publications:
            document.goat_status = GoaTStatus.PUBLICATION_AVAILABLE
        if current_goat_status != document.goat_status:
            update_date = GoaTUpdateDate.objects().first()
            if not update_date:
                GoaTUpdateDate(updated=datetime.datetime.now(),taxid=document.taxid).save()
            else:
                update_date.save(updated=datetime.datetime.now(),taxid=document.taxid)


@handler(db.pre_save)
def update_biosample_links(sender, document, **kwargs):
    document.assemblies = Assembly.objects(sample_accession=document.accession).scalar('accession')
    document.experiments = Experiment.objects(sample_accession=document.accession).scalar('experiment_accession')
    query={"metadata__sample derived from":document.accession}
    document.sub_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": True}}).filter(**query).scalar('accession')


def trigger_organism_update(taxid):
    organism = Organism.objects(taxid=taxid).first()
    if organism:
        organism.save()

def update_taxons(lineage):
    for node in lineage:
        leaves = Organism.objects(taxon_lineage=node.taxid, taxid__ne=node.taxid).count()
        if leaves == 0:
            TaxonNode.objects(children=node.taxid).update(pull__children=node.taxid)
            node.delete()
        else:
            node.modify(leaves=leaves)

@handler(db.post_delete)
def delete_organism_related_data( sender, document ):
    taxid = document.taxid
    Assembly.objects(taxid=taxid).delete()
    GenomeAnnotation.objects(taxid=taxid).delete()
    Experiment.objects(taxid=taxid).delete()
    LocalSample.objects(taxid=taxid).delete()
    BioSample.objects(taxid=taxid).delete()
    BioGenomeUser.objects(species=taxid).update(pull__species=taxid)
    taxons = TaxonNode.objects(taxid__in=document.taxon_lineage)
    update_taxons(taxons)


@handler(db.post_delete)
def delete_biosample_related_data(sender, document):
    accession = document.accession
    Assembly.objects(sample_accession=accession).delete()
    experiments = Experiment.objects(sample_accession=accession)
    experiment_accessions = [exp.experiment_accession for exp in experiments]
    experiments.delete()
    SampleCoordinates.objects(sample_accession=accession).delete()
    Read.objects(experiment_accession__in=experiment_accessions).delete()
    BioSample.objects(accession__in=document.sub_samples).delete()
    trigger_organism_update(document.taxid)

@handler(db.post_delete)
def delete_local_sample_related_data(sender, document):
    local_id = document.local_id
    SampleCoordinates.objects(sample_accession=local_id).delete()
    trigger_organism_update(document.taxid)

@handler(db.post_delete)
def delete_assembly_related_data(sender, document):
    accession = document.accession
    if document.chromosomes:
        Chromosome.objects(accession_version__in=document.chromosomes).delete()
    GenomeAnnotation.objects(assembly_accession=accession).delete()
    trigger_organism_update(document.taxid)

@handler(db.post_delete)
def delete_experiment_related_data(sender, document):
    Read.objects(experiment_accession=document.experiment_accession).delete()
    trigger_organism_update(document.taxid)

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

@delete_experiment_related_data.apply
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

class Read(db.Document):
    run_accession = db.StringField(required=True, unique=True)
    experiment_accession = db.StringField(required=True)
    metadata = db.DictField()

@delete_assembly_related_data.apply
class Assembly(db.Document):
    accession = db.StringField(unique=True)
    assembly_name=db.StringField()
    blobtoolkit_id = db.StringField()
    scientific_name= db.StringField()
    taxid = db.StringField(required=True)
    sample_accession=db.StringField()
    created = db.DateTimeField(default=datetime.datetime.utcnow)
    metadata=db.DictField()
    chromosomes=db.ListField(db.StringField())
    chromosomes_aliases=db.BinaryField()
    has_chromosomes_aliases=db.BooleanField(default=False)
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

@delete_local_sample_related_data.apply
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

@update_biosample_links.apply
@delete_biosample_related_data.apply
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
   

class CommonName(db.EmbeddedDocument):
    value=db.StringField()
    lang=db.StringField()
    locality=db.StringField()

class Publication(db.EmbeddedDocument):
    source = db.EnumField(PublicationSource)
    id = db.StringField()

@delete_organism_related_data.apply
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

class GoaTUpdateDate(db.Document):
    updated = db.DateTimeField(default=datetime.datetime.utcnow)
    taxid = db.StringField(required=True)

class CronJob(db.Document):
    status = db.EnumField(CronJobStatus, required=True)
    cronjob_type = db.StringField(required=True,unique=True)

class BioGenomeUser(db.Document):
    name=db.StringField(unique=True,required=True)
    password=db.StringField(required=True)
    role=db.EnumField(Roles, required=True)
    species=db.ListField(db.StringField())


# class GoaTStatus(db.Document):
#     goat_status = db.EnumField(GoaTStatus)
#     target_list_status = db.EnumField(TargetListStatus)
#     scientific_name = db.StringField(required=True,unique=True)
#     taxid = db.StringField(required= True,unique=True)
#     meta = {
#         'indexes': [
#             'scientific_name',
#             'taxid'
#         ],
#         'strict': False
#     }

# class INSDCStatus(db.Document):
#     scientific_name = db.StringField(required=True,unique=True)
#     taxid = db.StringField(required= True,unique=True)
#     insdc_status = db.EnumField(INSDCStatus)
#     meta = {
#         'indexes': [
#             'scientific_name',
#             'taxid'
#         ],
#         'strict': False
#     }

# class OrganismMetadata(db.Document):
#     publications = db.ListField(db.EmbeddedDocumentField(Publication))
#     metadata = db.DictField()
#     tolid_prefix = db.StringField()
#     links = db.ListField(db.URLField())
#     common_names= db.ListField(db.EmbeddedDocumentField(CommonName))
#     countries = db.ListField(db.StringField())
#     scientific_name = db.StringField(required=True,unique=True)
#     taxid = db.StringField(required= True,unique=True)
#     image = db.URLField()
#     image_urls = db.ListField(db.URLField())
#     meta = {
#         'indexes': [
#             'scientific_name',
#             'taxid'
#         ],
#         'strict': False
#     }

# class OrganismPublication(db.Document):
#     source = db.EnumField(PublicationSource)
#     publication_id = db.StringField(required=True, unique=True)
#     taxid = db.StringField(required=True)
#     scientific_name = db.StringField(required=True)
#     title = db.StringField()
#     description = db.StringField()
#     metadata = db.DictField()
#     meta = {
#         'indexes': [
#             'scientific_name',
#             'taxid'
#         ],
#         'strict': False
#     }

class ComputedTree(db.Document):
    last_update = db.DateTimeField(default=datetime.datetime.now())
    tree = db.DictField()
