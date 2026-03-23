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


class OrganismAttributedImage(db.EmbeddedDocument):
    """Species image from an external provider with attribution for license compliance."""

    url = db.URLField(required=True)
    author = db.StringField()
    source = db.EnumField(ExternalImageSource, required=True)
    license = db.StringField(required=True)
    license_url = db.URLField()
    source_record_url = db.URLField()
    external_id = db.StringField()
    verified_taxon_name = db.StringField()
    fetched_at = db.DateTimeField(default=datetime.datetime.utcnow)
