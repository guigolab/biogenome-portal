# from typing_extensions import Required
from . import db
from enum import Enum, unique

class TrackStatus(Enum):
    SAMPLE = 'Biosample Submitted'
    MAP_READS = 'Mapped Reads Submitted'
    ASSEMBLIES = 'Assemblies Submitted'
    RAW_DATA = 'Raw Data Submitted'
    ANN_COMPLETE = 'Annotation Complete'
    ANN_SUBMITTED = 'Annotation Submitted'
    
class TargetListStatus(Enum):
    CBP_RAP = 'cbp_family_representative'
    CBP_OTHER = 'cbp_other_priority'
    CBP = 'cbp'


class TaxonNode(db.Document):
    children = db.ListField(db.LazyReferenceField('self', passthrough=True))
    name = db.StringField(required=True,unique=True)
    taxid = db.StringField(required= True)
    rank = db.StringField()
    leaves = db.IntField()
    
    

class Experiment(db.Document):
    study_accession= db.StringField()
    secondary_study_accession= db.StringField()
    sample_accession= db.StringField()
    secondary_sample_accession= db.StringField()
    experiment_accession= db.StringField()
    run_accession= db.StringField()
    submission_accession= db.StringField()
    tax_id= db.StringField()
    scientific_name= db.StringField()
    instrument_platform= db.StringField()
    instrument_model= db.StringField()
    library_name= db.StringField()
    nominal_length= db.StringField()
    library_layout= db.StringField()
    library_strategy= db.StringField()
    library_source= db.StringField()
    library_selection= db.StringField()
    read_count= db.StringField()
    base_count= db.StringField()
    center_name= db.StringField()
    first_public= db.StringField()
    last_updated= db.StringField()
    experiment_title= db.StringField()
    study_title= db.StringField()
    study_alias= db.StringField()
    experiment_alias= db.StringField()
    run_alias= db.StringField()
    fastq_bytes= db.StringField()
    fastq_md5= db.StringField()
    fastq_ftp= db.StringField()
    fastq_aspera= db.StringField()
    fastq_galaxy= db.StringField()
    submitted_bytes= db.StringField()
    submitted_md5= db.StringField()
    submitted_ftp= db.StringField()
    submitted_aspera= db.StringField()
    submitted_galaxy= db.StringField()
    submitted_format= db.StringField()
    sra_bytes= db.StringField()
    sra_md5= db.StringField()
    sra_ftp= db.StringField()
    sra_aspera= db.StringField()
    sra_galaxy= db.StringField()
    cram_index_ftp= db.StringField()
    cram_index_aspera= db.StringField()
    cram_index_galaxy= db.StringField()
    sample_alias= db.StringField()
    broker_name= db.StringField()
    sample_title= db.StringField()
    nominal_sdev= db.StringField()
    first_created= db.StringField()

class Assembly(db.Document):
    accession = db.StringField()
    version = db.StringField()
    assembly_name = db.StringField()
    description = db.StringField()
    sample_accession = db.StringField()

class SecondaryOrganism(db.Document):
    assemblies = db.ListField(db.LazyReferenceField(Assembly))
    experiments = db.ListField(db.LazyReferenceField(Experiment))
    accession = db.StringField(required=True,unique=True)
    taxonId = db.IntField(required=True)
    customFields = db.ListField(db.DictField())
    specimens = db.ListField(db.LazyReferenceField('self', passthrough=True))
    organism_part = db.DictField()
    lifestage = db.DictField()
    project_name = db.DictField()
    tolid = db.DictField()
    barcoding_center = db.DictField()
    collected_by = db.DictField()
    collection_date = db.DictField()
    geographic_location_country = db.DictField()
    geographic_location_latitude = db.DictField()
    geographic_location_longitude = db.DictField()
    geographic_location_region_and_locality = db.DictField()
    identified_by = db.DictField()
    geographic_location_depth = db.DictField()
    geographic_location_elevation = db.DictField()
    habitat = db.DictField()
    identifier_affiliation = db.DictField()
    original_collection_date = db.DictField()
    original_geographic_location = db.DictField()
    sample_derived_from = db.DictField()
    sample_same_as = db.DictField()
    sample_symbiont_of = db.DictField()
    sample_coordinator = db.DictField()
    sample_coordinator_affiliation = db.DictField()
    sex = db.DictField()
    relationship = db.DictField()
    symbiont = db.DictField()
    collecting_institution = db.DictField()
    GAL = db.DictField()
    specimen_voucher = db.DictField()
    specimen_id = db.DictField()
    GAL_sample_id = db.DictField()
    culture_or_strain_id = db.DictField()

class Organism(db.Document):
    assemblies = db.ListField(db.LazyReferenceField(Assembly))
    experiments = db.ListField(db.LazyReferenceField(Experiment))
    commonName = db.StringField()
    organism = db.StringField(required=True,unique=True)
    records = db.ListField(db.LazyReferenceField(SecondaryOrganism))
    taxid = db.StringField(required= True)
    image = db.FileField()
    taxon_lineage = db.ListField(db.LazyReferenceField(TaxonNode))
    trackingSystem = db.EnumField(TrackStatus, default=TrackStatus.SAMPLE)

