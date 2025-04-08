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
    assemblies =  Assembly.objects(taxid=taxid).count()
    experiments = Experiment.objects(taxid=taxid).count()
    biosamples = BioSample.objects(taxid=taxid).count()
    local_samples = LocalSample.objects(taxid=taxid).count()
    submitted_biosamples = BioSampleSubmission.objects(taxid=taxid).count()
    #update insdc_status
    if assemblies:
        document.insdc_status= INSDCStatus.ASSEMBLIES
    elif experiments:
        document.insdc_status= INSDCStatus.READS
    elif biosamples:
        document.insdc_status=INSDCStatus.SAMPLE
    else:
        document.insdc_status=None

    #update goat status
    if GOAT_PROJECT_NAME:
        current_goat_status=document.goat_status
        if document.publications:
            document.goat_status = GoaTStatus.PUBLICATION_AVAILABLE
        elif assemblies:
            document.goat_status=GoaTStatus.INSDC_SUBMITTED
        elif experiments:
            document.goat_status=GoaTStatus.IN_ASSEMBLY
        elif local_samples or submitted_biosamples:
            document.goat_status=GoaTStatus.SAMPLE_COLLECTED

        if current_goat_status != document.goat_status:
            update_date = GoaTUpdateDate.objects().first()
            if not update_date:
                GoaTUpdateDate(updated=datetime.datetime.now(),taxid=document.taxid).save()
            else:
                update_date.save(updated=datetime.datetime.now(),taxid=document.taxid)

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
            'taxid', 'children'
        ]
    }


class SubProject(db.Document):
    name = db.StringField(required=True, unique=True)
    primary_contact = db.StringField(required=True)
    primary_contact_institution = db.StringField(required=True)
    primary_contact_email = db.StringField(required=True)
    date_of_update = db.DateField()
    schema_version = db.StringField()
    metadata = db.DictField()
    meta = {
        'indexes': [
            'name', 'primary_contact_email'
        ]
    }

@delete_experiment_related_data.apply
class Experiment(db.Document):
    sample_accession= db.StringField()
    experiment_accession= db.StringField(unique=True)
    instrument_platform = db.StringField()
    taxon_lineage = db.ListField(db.StringField())
    instrument_model = db.StringField()
    taxid = db.StringField(required=True)
    scientific_name= db.StringField()
    created = db.DateTimeField(default=datetime.datetime.now())
    metadata=db.DictField()
    meta = {
        'indexes': ['experiment_accession','taxid', 'taxon_lineage']
    }


class Read(db.Document):
    run_accession = db.StringField(required=True, unique=True)
    experiment_accession = db.StringField(required=True)
    metadata = db.DictField()

@delete_assembly_related_data.apply
class Assembly(db.Document):
    accession = db.StringField(unique=True)
    taxon_lineage = db.ListField(db.StringField())
    assembly_name=db.StringField()
    blobtoolkit_id = db.StringField()
    scientific_name= db.StringField()
    taxid = db.StringField(required=True)
    sample_accession=db.StringField()
    created = db.DateTimeField(default=datetime.datetime.now())
    metadata=db.DictField()
    chromosomes=db.ListField(db.StringField())
    chromosomes_aliases=db.BinaryField()
    has_chromosomes_aliases=db.BooleanField(default=False)
    meta = {
        'indexes': ['accession','taxid', 'taxon_lineage']
    }

class LocalAssembly(db.Document):
    assembly_id = db.StringField(unique=True)
    taxon_lineage = db.ListField(db.StringField())
    scientific_name= db.StringField()
    taxid = db.StringField(required=True)
    sample_accession=db.StringField()
    created = db.DateTimeField(default=datetime.datetime.now())
    metadata=db.DictField()
    meta = {
        'indexes': ['assembly_id','taxid', 'taxon_lineage']
    }

class Chromosome(db.Document):
    accession_version = db.StringField(required=True,unique=True)
    metadata=db.DictField()
    meta = {
        'indexes': ['accession_version']
    }

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
    lineage=db.ListField(db.StringField())
    coordinates = db.PointField()
    image = db.URLField()
    meta = {
        'indexes': ['sample_accession','taxid','scientific_name' ,'lineage']
    }

@delete_local_sample_related_data.apply
class LocalSample(db.Document):
    created = db.DateTimeField(default=datetime.datetime.now())
    local_id = db.StringField(required=True,unique=True)
    taxon_lineage = db.ListField(db.StringField())
    user = db.StringField()
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
            'local_id','taxid','taxon_lineage'
        ],
        'strict': False
    }

@delete_biosample_related_data.apply
class BioSample(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    taxon_lineage = db.ListField(db.StringField())
    accession = db.StringField(required=True,unique=True)
    collection_date=db.StringField() #TODO: add job to parse collection date form metadata 
    location = db.PointField()
    bioprojects = db.ListField(db.StringField())
    sub_samples = db.ListField(db.StringField())
    created = db.DateTimeField(default=datetime.datetime.now())
    last_check = db.DateTimeField()
    metadata=db.DictField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    meta = {
        'indexes': [
            'accession','taxid','scientific_name', 'taxon_lineage'
        ],
        'strict': False
    }

class BioSampleSubmission(db.DynamicDocument):
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    user = db.StringField(required=True)
    characteristics = db.DictField(required=True)

class GenomeAnnotation(db.Document):
    assembly_accession = db.StringField(required=True)
    assembly_name = db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    taxon_lineage = db.ListField(db.StringField())
    name = db.StringField(required=True,unique=True)
    gff_gz_location = db.URLField(required=True)
    tab_index_location = db.URLField(required=True)
    created = db.DateTimeField(default=datetime.datetime.now())
    metadata=db.DictField()
    user=db.StringField()
    external=db.BooleanField(default=True)
    meta = {
        'indexes': [
            'name','taxid', 'taxon_lineage'
        ],
        'strict': False
    }

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
    publications = db.ListField(db.EmbeddedDocumentField(Publication))
    metadata = db.DictField()
    sub_project= db.StringField()
    tolid_prefix = db.StringField()
    links = db.ListField(db.URLField())
    sub_project = db.StringField()
    common_names= db.ListField(db.EmbeddedDocumentField(CommonName))
    countries = db.ListField(db.StringField())
    sequencing_type = db.ListField(db.StringField())
    insdc_common_name = db.StringField()
    scientific_name = db.StringField(required=True,unique=True)
    taxid = db.StringField(required= True,unique=True)
    image = db.URLField()
    pending_deletion = db.BooleanField()
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
            'taxid',
            'taxon_lineage'
        ],
        'strict': False
    }

class GoaTUpdateDate(db.Document):
    updated = db.DateTimeField(default=datetime.datetime.now())
    taxid = db.StringField(required=True)

class CronJob(db.Document):
    status = db.EnumField(CronJobStatus, required=True)
    cronjob_type = db.StringField(required=True,unique=True)

class BioGenomeUser(db.Document):
    name=db.StringField(unique=True,required=True)
    password=db.StringField(required=True)
    role=db.EnumField(Roles, required=True)
    species=db.ListField(db.StringField())
    sub_projects = db.ListField(db.StringField())
    email = db.StringField()

class OrganismPublication(db.Document):
    source = db.EnumField(PublicationSource)
    id = db.StringField()
    taxid = db.StringField(required=True)

class OrganismNames(db.Document):
    value=db.StringField()
    lang=db.StringField()
    locality=db.StringField()
    taxid=db.StringField(required=True)


