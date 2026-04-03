import datetime

from .enums import ExternalImageSource, PublicationSource
import mongoengine as db

class CommonName(db.EmbeddedDocument):
    value=db.StringField()
    lang=db.StringField()
    locality=db.StringField()

class Publication(db.EmbeddedDocument):
    source = db.EnumField(PublicationSource)
    id = db.StringField()

class OrganismImage(db.EmbeddedDocument):
    url = db.URLField(required=True)
    author = db.StringField()
    source_record_url = db.URLField(required=True)
    license = db.StringField(required=True)
    license_url = db.URLField()


class OrganismLineageRankLabels(db.EmbeddedDocument):
    """
    Scientific names at major ranks along the organism's ``taxon_lineage`` (taxids).

    Populated from :class:`~db.model.TaxonNode` rows; keys align with NCBI-style ranks.
    ``class_name`` stores the taxon name for rank ``class`` (``class`` is reserved in Python).
    """
    kingdom = db.StringField()
    phylum = db.StringField()
    class_name = db.StringField()
    order = db.StringField()
    family = db.StringField()
    genus = db.StringField()


class OrganismRedList(db.EmbeddedDocument):
    """
    Cached IUCN Red List assessment snapshot (API v4).

    ``habitats`` / ``threats`` preserve API list items; ``narratives`` holds text from
    ``documentation`` and string fields under ``supplementary_info`` (truncated for size).
    """

    not_found = db.BooleanField(default=False)
    category = db.StringField()
    population_trend = db.StringField()
    assessment_date = db.StringField()
    published_year = db.StringField()
    habitats = db.ListField(db.DictField())
    threats = db.ListField(db.DictField())
    narratives = db.DictField()
    fetched_at = db.DateTimeField()
    source_api_version = db.StringField(default="v4")
