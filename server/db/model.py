"""MongoEngine document models for the portal (import as ``from db.model import Organism``)."""

from __future__ import annotations

import datetime

import mongoengine as db

from .embedded_docs import (
    CommonName,
    OrganismImage,
    OrganismLineageRankLabels,
    OrganismRedList,
    Publication,
)
from .enums import (
    BrokerSource,
    GoaTStatus,
    INSDCStatus,
    PublicationSource,
    Roles,
    TargetListStatus,
)


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class Assembly(db.Document):
    accession = db.StringField(unique=True)
    taxon_lineage = db.ListField(db.StringField())
    assembly_name = db.StringField()
    blobtoolkit_id = db.StringField()
    scientific_name = db.StringField()
    taxid = db.StringField(required=True)
    sample_accession = db.StringField()
    created = db.DateTimeField(default=_utc_now)
    metadata = db.DictField()
    chromosomes = db.ListField(db.StringField())
    chromosomes_aliases = db.BinaryField()
    has_chromosomes_aliases = db.BooleanField(default=False)
    meta = {
        "indexes": ["accession", "taxid", "taxon_lineage"],
    }


class BioGenomeUser(db.Document):
    name = db.StringField(unique=True, required=True)
    password = db.StringField(required=True)
    role = db.EnumField(Roles, required=True)
    species = db.ListField(db.StringField())
    sub_projects = db.ListField(db.StringField())
    email = db.StringField()
    # Links this curator account to one or more OrganismPrincipal rows (by slug). Used to
    # project PI / institute / program info onto species via assigned curators; see
    # docs/cbp-pi-contributor-migration.md. Organism itself is never linked directly.
    principal_ids = db.ListField(db.StringField())


class BioProject(db.Document):
    accession = db.StringField(required=True, unique=True)
    title = db.StringField()
    children = db.ListField(db.StringField())
    leaves = db.IntField()
    meta = {
        "indexes": ["accession"],
    }


class BioSampleFetchFailure(db.Document):
    """
    Audit record for biosample accessions that could not be resolved after all
    fetch strategies (NCBI datasets metadata, ENA bulk XML, EBI BioSamples API,
    NCBI Entrez) were exhausted during an ingest run.

    One document per ``(biosample_accession, related_model, related_id)`` triple;
    updated in-place on repeated failures via pymongo upsert.  Cleared when the
    accession is successfully resolved in a later run.
    """

    biosample_accession = db.StringField(required=True)
    related_model = db.StringField(required=True)   # "Assembly" | "ReadRun"
    related_id = db.StringField(required=True)       # assembly accession or run_accession
    last_attempt_at = db.DateTimeField(required=True)
    attempt_count = db.IntField(default=1)
    last_error = db.StringField()
    meta = {
        "indexes": [
            "biosample_accession",
            "last_attempt_at",
            {
                "fields": ["biosample_accession", "related_model", "related_id"],
                "unique": True,
            },
        ]
    }


class BioSampleSubmission(db.DynamicDocument):
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    user = db.StringField(required=True)
    characteristics = db.DictField(required=True)


class BioSample(db.Document):
    assemblies = db.ListField(db.StringField())
    experiments = db.ListField(db.StringField())
    taxon_lineage = db.ListField(db.StringField())
    accession = db.StringField(required=True, unique=True)
    collection_date = db.StringField()
    location = db.PointField()
    bioprojects = db.ListField(db.StringField())
    sub_samples = db.ListField(db.StringField())
    created = db.DateTimeField(default=_utc_now)
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


class Chromosome(db.Document):
    accession_version = db.StringField(required=True, unique=True)
    metadata = db.DictField()
    meta = {
        "indexes": ["accession_version"],
    }


class Experiment(db.Document):
    sample_accession = db.StringField()
    experiment_accession = db.StringField(unique=True)
    instrument_platform = db.StringField()
    taxon_lineage = db.ListField(db.StringField())
    instrument_model = db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField() 
    created = db.DateTimeField(default=_utc_now)
    metadata = db.DictField()
    meta = {
        "indexes": ["experiment_accession", "taxid", "taxon_lineage"],
    }


class GenomeAnnotation(db.Document):
    assembly_accession = db.StringField(required=True)
    assembly_name = db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    taxon_lineage = db.ListField(db.StringField())
    name = db.StringField(required=True, unique=True)
    gff_gz_location = db.URLField(required=True)
    tab_index_location = db.URLField(required=True)
    created = db.DateTimeField(default=_utc_now)
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


class GoaTUpdateDate(db.Document):
    updated = db.DateTimeField(default=_utc_now)
    taxid = db.StringField(required=True)


class LocalAssembly(db.Document):
    assembly_id = db.StringField(unique=True)
    taxon_lineage = db.ListField(db.StringField())
    scientific_name = db.StringField()
    taxid = db.StringField(required=True)
    sample_accession = db.StringField()
    created = db.DateTimeField(default=_utc_now)
    metadata = db.DictField()
    meta = {
        "indexes": ["assembly_id", "taxid", "taxon_lineage"],
    }


class LocalSample(db.Document):
    created = db.DateTimeField(default=_utc_now)
    local_id = db.StringField(required=True, unique=True)
    taxon_lineage = db.ListField(db.StringField())
    user = db.StringField()
    last_check = db.DateTimeField()
    location = db.PointField()
    country = db.StringField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    valid = db.BooleanField()
    broker = db.EnumField(BrokerSource, default=BrokerSource.LOCAL)
    metadata = db.DictField()
    meta = {
        "indexes": [
            "local_id",
            "taxid",
            "taxon_lineage",
        ],
        "strict": False,
    }


class Organism(db.Document):
    publications = db.ListField(db.EmbeddedDocumentField(Publication))
    genome_publication = db.EmbeddedDocumentField(Publication)
    metadata = db.DictField()
    sub_project = db.StringField()
    tolid_prefix = db.StringField()
    links = db.ListField(db.URLField())
    common_names = db.ListField(db.EmbeddedDocumentField(CommonName))
    countries = db.ListField(db.StringField())
    insdc_common_name = db.StringField()
    scientific_name = db.StringField(required=True, unique=True)
    taxid = db.StringField(required=True, unique=True)
    image = db.URLField()
    pending_deletion = db.BooleanField()
    image_urls = db.ListField(db.URLField())
    images = db.ListField(db.EmbeddedDocumentField(OrganismImage))
    taxon_lineage = db.ListField(db.StringField())
    lineage_rank_labels = db.EmbeddedDocumentField(OrganismLineageRankLabels)
    insdc_status = db.EnumField(INSDCStatus)
    goat_status = db.EnumField(GoaTStatus)
    target_list_status = db.EnumField(TargetListStatus)
    assemblies_count = db.IntField()
    reads_count = db.IntField()
    biosamples_count = db.IntField()
    local_samples_count = db.IntField()
    genome_annotations_count = db.IntField()
    iucn_redlist = db.EmbeddedDocumentField(OrganismRedList)
    meta = {
        "indexes": [
            "scientific_name",
            "insdc_common_name",
            "tolid_prefix",
            "taxid",
            "taxon_lineage",
            "lineage_rank_labels.kingdom",
            "lineage_rank_labels.phylum",
            "lineage_rank_labels.class_name",
            "lineage_rank_labels.order",
            "lineage_rank_labels.family",
            "lineage_rank_labels.genus",
            "iucn_redlist.category",
        ],
        "strict": False,
    }


class OrganismAuditLog(db.Document):
    action = db.StringField(required=True)
    user = db.StringField(required=True)
    timestamp = db.DateTimeField(default=_utc_now)
    previous_object = db.DictField()
    new_object = db.DictField()
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    meta = {
        "indexes": ["timestamp", "taxid", "scientific_name", "action", "user"],
    }


class OrganismNames(db.Document):
    value = db.StringField()
    lang = db.StringField()
    locality = db.StringField()
    taxid = db.StringField(required=True)


class OrganismPrincipal(db.Document):
    """
    Catalog row for a funding/scientific authority (e.g. CBP: Principal Investigator).

    Linked only through ``BioGenomeUser.principal_ids`` — never directly on ``Organism``.
    Species inherit PI / institute / program by projecting through assigned curators
    (see ``services.organisms`` CMS list projection and docs/cbp-pi-contributor-migration.md).
    """

    slug = db.StringField(required=True, unique=True)
    name = db.StringField(required=True)
    affiliations = db.ListField(db.StringField())
    programs = db.ListField(db.StringField())
    email = db.StringField()
    metadata = db.DictField()
    meta = {"indexes": ["slug", "name"]}


class OrganismPublication(db.Document):
    source = db.EnumField(PublicationSource)
    id = db.StringField()
    taxid = db.StringField(required=True)


class Read(db.Document):
    run_accession = db.StringField(required=True, unique=True)
    experiment_accession = db.StringField(required=True)
    metadata = db.DictField()


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


class TaxonNode(db.Document):
    children = db.ListField(db.StringField())
    name = db.StringField(required=True)
    taxid = db.StringField(required=True, unique=True)
    parent = db.StringField()
    leaves = db.IntField()
    submitted_biosamples_count = db.IntField()
    rank = db.StringField()
    organisms_count = db.IntField()
    assemblies_count = db.IntField()
    reads_count = db.IntField()
    biosamples_count = db.IntField()
    local_samples_count = db.IntField()
    genome_annotations_count = db.IntField()
    meta = {
        "indexes": [
            "taxid",
            "children",
        ]
    }
