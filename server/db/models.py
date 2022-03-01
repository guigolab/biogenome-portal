# from typing_extensions import Required
from . import db
from enum import Enum
from datetime import datetime

class TrackStatus(Enum):
    SAMPLE = 'Biosample Submitted'
    RAW_DATA = 'Raw Data Submitted'
    ASSEMBLIES = 'Assemblies Submitted'
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
    meta = {
        'indexes': [
            'name',  
            'taxid'
        ]
    }

class Experiment(db.Document):
    study_accession= db.StringField()
    secondary_study_accession= db.StringField()
    sample_accession= db.StringField()
    secondary_sample_accession= db.StringField()
    experiment_accession= db.StringField(unique=True)
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
    meta = {
        'indexes': ['experiment_accession']
    }

class Assembly(db.Document):
    accession = db.StringField(unique=True)
    version = db.StringField()
    assembly_name = db.StringField()
    description = db.StringField()
    sample_accession = db.StringField()
    meta = {
        'indexes': ['accession']
    }

class SecondaryOrganism(db.Document):
    assemblies = db.ListField(db.LazyReferenceField(Assembly))
    experiments = db.ListField(db.LazyReferenceField(Experiment))
    accession = db.StringField()
    created = db.DateTimeField(default=datetime.utcnow())
    taxid = db.StringField(required=True)
    scientificName = db.StringField(required=True)
    tube_or_well_id=db.StringField()
    custom_fields = db.DictField(db.StringField())
    specimens = db.ListField(db.LazyReferenceField('self', passthrough=True))
    organism_part=db.StringField()
    lifestage=db.StringField()
    project_name=db.StringField() 
    tolid=db.StringField()
    barcoding_center=db.StringField()
    collected_by=db.StringField()
    collector_orcid_id=db.StringField()
    collection_date=db.StringField()
    time_of_collection=db.StringField()
    description_of_collection_method=db.StringField()
    geographic_location_country=db.StringField()
    geographic_location_latitude=db.StringField()
    geographic_location_longitude=db.StringField()
    geographic_location_region_and_locality=db.StringField()
    grid_reference=db.StringField()
    identified_by=db.StringField()
    identified_how=db.StringField()
    geographic_location_depth=db.StringField()
    geographic_location_elevation=db.StringField()
    habitat=db.StringField()
    identifier_affiliation=db.StringField()
    original_collection_date=db.StringField()
    original_geographic_location=db.StringField()
    sample_derived_from=db.StringField()
    sample_same_as=db.StringField()
    sample_symbiont_of=db.StringField()
    sample_coordinator=db.StringField()
    sample_coordinator_affiliation=db.StringField()
    sample_coordinator_orcid_id=db.StringField()
    preserved_by=db.StringField()
    preserver_affiliation=db.StringField()
    preservation_approach=db.StringField()
    preservative_solution=db.StringField()
    barcode_plate_preservative=db.StringField()
    time_elapsed_from_collection_preservation=db.StringField()
    date_of_preservation=db.StringField()
    sex=db.StringField()
    relationship=db.StringField()
    symbiont=db.StringField()
    collecting_institution=db.StringField()
    GAL=db.StringField()
    specimen_voucher=db.StringField()
    specimen_id=db.StringField()
    specimen_id_risk=db.StringField()
    tissue_for_barcoding=db.StringField()
    purpose_of_specimen=db.StringField()
    hazard_group=db.StringField()
    other_informations=db.StringField()
    regulatory_compliance=db.StringField()
    indigenous_rights_applicable=db.StringField()
    associated_traditional_knowledge_applicable=db.StringField()
    ethics_permits_mandatory=db.StringField()
    sampling_permits_mandatory=db.StringField()
    nagoya_permits_mandatory=db.StringField()
    tissue_for_biobanking=db.StringField()
    taxon_remarks=db.StringField()
    infraspecific_epithet=db.StringField()
    dna_removed_from_biobanking=db.StringField()
    tissue_removed_from_barcoding=db.StringField()
    tube_or_well_id_for_barcoding=db.StringField()
    tissue_voucher_id_for_biobanking=db.StringField()
    dna_voucher_id_for_biobanking=db.StringField()
    difficult_or_high_priority_sample=db.StringField()
    size_of_tissue_in_tube=db.StringField()
    GAL_sample_id=db.StringField()
    specimen_id_risk=db.StringField()
    collector_sample_id=db.StringField()
    culture_or_strain_id=db.StringField()
    common_name=db.StringField()
    custom_fields = db.DictField()
    meta = {
        'indexes': [
            {'fields':('accession','tube_or_well_id'), 'unique':True}
        ]
    }

class Organism(db.Document):
    assemblies = db.ListField(db.LazyReferenceField(Assembly))
    experiments = db.ListField(db.LazyReferenceField(Experiment))
    # common_names = db.ListField(db.LazyReferenceField(NameOntology))
    common_name = db.ListField(db.StringField())
    organism = db.StringField(required=True,unique=True)
    records = db.ListField(db.LazyReferenceField(SecondaryOrganism))
    taxid = db.StringField(required= True)
    image = db.FileField()
    taxon_lineage = db.ListField(db.LazyReferenceField(TaxonNode))
    trackingSystem = db.EnumField(TrackStatus, default=TrackStatus.SAMPLE)
    meta = {
        'indexes': [
            'organism',
            'common_name',
            'taxid'
        ]
    }