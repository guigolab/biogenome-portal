"""
MongoEngine document classes only (no signal handlers).

Helpers and services should import from here when they only need model types/queries,
avoiding a dependency on ``db.models`` signal registration.
"""

import datetime

import mongoengine as db

from .enums import (
    BrokerSource,
    CronJobStatus,
    GoaTStatus,
    INSDCStatus,
    PublicationSource,
    Roles,
    TargetListStatus,
)

__all__ = [
    "BrokerSource",
    "CronJobStatus",
    "GoaTStatus",
    "INSDCStatus",
    "PublicationSource",
    "Roles",
    "TargetListStatus",
    "TaxonNode",
    "SubProject",
    "ReadRun",
    "Read",
    "Experiment",
    "Assembly",
    "LocalAssembly",
    "Chromosome",
    "BioProject",
    "SampleCoordinates",
    "LocalSample",
    "BioSample",
    "BioSampleSubmission",
    "GenomeAnnotation",
    "CommonName",
    "Publication",
    "Organism",
    "GoaTUpdateDate",
    "CronJob",
    "BioGenomeUser",
    "OrganismPublication",
    "OrganismNames",
    "OrganismAuditLog",
]


class TaxonNode(db.Document):
    children = db.ListField(db.StringField())  # stores taxids
    parent = db.StringField()
    name = db.StringField(required=True)
    taxid = db.StringField(required=True, unique=True)
    rank = db.StringField()
    leaves = db.IntField()
    organisms_count = db.IntField()
    assemblies_count = db.IntField()
    reads_count = db.IntField()
    biosamples_count = db.IntField()
    local_samples_count = db.IntField()
    submitted_biosamples_count = db.IntField()
    genome_annotations_count = db.IntField()
    meta = {
        "indexes": [
            "taxid",
            "children",
            "parent",
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
        "indexes": [
            "name",
            "primary_contact_email",
        ]
    }


class ReadRun(db.Document):
    run_accession = db.StringField(required=True, unique=True)
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    taxon_lineage = db.ListField(db.StringField())
    sample_accession = db.StringField(required=True)
    experiment_accession = db.StringField()
    metadata = db.DictField()
    meta = {
        "indexes": [
            "run_accession",
            "taxid",
            "taxon_lineage",
            "sample_accession",
            "experiment_accession",
        ]
    }


class Read(db.Document):
    run_accession = db.StringField(required=True, unique=True)
    experiment_accession = db.StringField(required=True)
    metadata = db.DictField()


class Experiment(db.Document):
    sample_accession = db.StringField()
    experiment_accession = db.StringField(unique=True)
    instrument_platform = db.StringField()
    taxon_lineage = db.ListField(db.StringField())
    instrument_model = db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField()
    created = db.DateTimeField(default=datetime.datetime.now())
    metadata = db.DictField()
    meta = {
        "indexes": ["experiment_accession", "taxid", "taxon_lineage"],
    }


class Assembly(db.Document):
    accession = db.StringField(unique=True)
    taxon_lineage = db.ListField(db.StringField())
    assembly_name = db.StringField()
    blobtoolkit_id = db.StringField()
    scientific_name = db.StringField()
    taxid = db.StringField(required=True)
    sample_accession = db.StringField()
    created = db.DateTimeField(default=datetime.datetime.now())
    metadata = db.DictField()
    chromosomes = db.ListField(db.StringField())
    chromosomes_aliases = db.BinaryField()
    has_chromosomes_aliases = db.BooleanField(default=False)
    meta = {
        "indexes": ["accession", "taxid", "taxon_lineage"],
    }


class LocalAssembly(db.Document):
    assembly_id = db.StringField(unique=True)
    taxon_lineage = db.ListField(db.StringField())
    scientific_name = db.StringField()
    taxid = db.StringField(required=True)
    sample_accession = db.StringField()
    created = db.DateTimeField(default=datetime.datetime.now())
    metadata = db.DictField()
    meta = {
        "indexes": ["assembly_id", "taxid", "taxon_lineage"],
    }


class Chromosome(db.Document):
    accession_version = db.StringField(required=True, unique=True)
    metadata = db.DictField()
    meta = {
        "indexes": ["accession_version"],
    }


class BioProject(db.Document):
    accession = db.StringField(required=True, unique=True)
    title = db.StringField()
    children = db.ListField(db.StringField())
    leaves = db.IntField()
    meta = {
        "indexes": ["accession"],
    }


class SampleCoordinates(db.Document):
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    sample_accession = db.StringField(required=True, unique=True)
    is_local_sample = db.BooleanField(default=False)
    lineage = db.ListField(db.StringField())
    coordinates = db.PointField()
    image = db.URLField()
    meta = {
        "indexes": ["sample_accession", "taxid", "scientific_name", "lineage"],
    }


class LocalSample(db.Document):
    created = db.DateTimeField(default=datetime.datetime.now())
    local_id = db.StringField(required=True, unique=True)
    taxon_lineage = db.ListField(db.StringField())
    user = db.StringField()
    last_check = db.DateTimeField()
    location = db.PointField()  # list of longitude, latitude tuples
    country = db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    valid = db.BooleanField()
    broker = db.EnumField(BrokerSource, default=BrokerSource.LOCAL)
    user = db.StringField()
    metadata = db.DictField()
    meta = {
        "indexes": [
            "local_id",
            "taxid",
            "taxon_lineage",
        ],
        "strict": False,
    }


class BioSample(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    taxon_lineage = db.ListField(db.StringField())
    accession = db.StringField(required=True, unique=True)
    collection_date = db.StringField()
    location = db.PointField()
    bioprojects = db.ListField(db.StringField())
    sub_samples = db.ListField(db.StringField())
    created = db.DateTimeField(default=datetime.datetime.now())
    last_check = db.DateTimeField()
    metadata = db.DictField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    meta = {
        "indexes": [
            "accession",
            "taxid",
            "scientific_name",
            "taxon_lineage",
        ],
        "strict": False,
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
    name = db.StringField(required=True, unique=True)
    gff_gz_location = db.URLField(required=True)
    tab_index_location = db.URLField(required=True)
    created = db.DateTimeField(default=datetime.datetime.now())
    metadata = db.DictField()
    user = db.StringField()
    external = db.BooleanField(default=True)
    meta = {
        "indexes": [
            "name",
            "taxid",
            "taxon_lineage",
        ],
        "strict": False,
    }


class CommonName(db.EmbeddedDocument):
    value = db.StringField()
    lang = db.StringField()
    locality = db.StringField()


class Publication(db.EmbeddedDocument):
    source = db.EnumField(PublicationSource)
    id = db.StringField()


class Organism(db.Document):
    publications = db.ListField(db.EmbeddedDocumentField(Publication))
    metadata = db.DictField()
    sub_project = db.StringField()
    tolid_prefix = db.StringField()
    links = db.ListField(db.URLField())
    sub_project = db.StringField()
    common_names = db.ListField(db.EmbeddedDocumentField(CommonName))
    countries = db.ListField(db.StringField())
    sequencing_type = db.ListField(db.StringField())
    insdc_common_name = db.StringField()
    scientific_name = db.StringField(required=True, unique=True)
    taxid = db.StringField(required=True, unique=True)
    image = db.URLField()
    pending_deletion = db.BooleanField()
    image_urls = db.ListField(db.URLField())
    taxon_lineage = db.ListField(db.StringField())
    assemblies_count = db.IntField()
    reads_count = db.IntField()
    biosamples_count = db.IntField()
    local_samples_count = db.IntField()
    submitted_biosamples_count = db.IntField()
    genome_annotations_count = db.IntField()
    insdc_status = db.EnumField(INSDCStatus)
    goat_status = db.EnumField(GoaTStatus)
    target_list_status = db.EnumField(TargetListStatus)
    meta = {
        "indexes": [
            "scientific_name",
            "insdc_common_name",
            "tolid_prefix",
            "taxid",
            "taxon_lineage",
        ],
        "strict": False,
    }


class GoaTUpdateDate(db.Document):
    updated = db.DateTimeField(default=datetime.datetime.now())
    taxid = db.StringField(required=True)


class CronJob(db.Document):
    status = db.EnumField(CronJobStatus, required=True)
    cronjob_type = db.StringField(required=True, unique=True)


class BioGenomeUser(db.Document):
    name = db.StringField(unique=True, required=True)
    password = db.StringField(required=True)
    role = db.EnumField(Roles, required=True)
    species = db.ListField(db.StringField())
    sub_projects = db.ListField(db.StringField())
    email = db.StringField()


class OrganismPublication(db.Document):
    source = db.EnumField(PublicationSource)
    id = db.StringField()
    taxid = db.StringField(required=True)


class OrganismNames(db.Document):
    value = db.StringField()
    lang = db.StringField()
    locality = db.StringField()
    taxid = db.StringField(required=True)


class OrganismAuditLog(db.Document):
    action = db.StringField(required=True)
    user = db.StringField(required=True)
    timestamp = db.DateTimeField(default=datetime.datetime.now())
    previous_organism = db.DictField()
    new_organism = db.DictField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    meta = {
        "indexes": ["timestamp", "taxid", "scientific_name", "action", "user"],
    }
