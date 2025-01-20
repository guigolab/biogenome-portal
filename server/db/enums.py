from enum import Enum

MODELS=[
    'biosamples',
    'annotations',
    'assemblies',
    'experiments',
    'organisms',
    'local_samples'
]

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
    SAMPLE = 'Biosample Submitted'
    READS = 'Reads Submitted'
    ASSEMBLIES = 'Assemblies Submitted'
    ANNOTATIONS = 'Annotation Completed'

class Roles(Enum):
    ##CRUD LOCAL_SAMPLES
    SAMPLE_MANAGER = 'SampleManager'

    ## CREATE NEW ORGANISM
    ## UPLOAD GOAT
    ## IMPORT FROM INSDC
    ## UPLOAD SPREADSHEET
    ## CREATE ANNOTATION
    ## CRUD RELATED DATA
    DATA_MANAGER = 'DataManager'

    ## ALL ACTIONS
    DATA_ADMIN = 'Admin'

class CronJobStatus(Enum):
    PENDING = 'PENDING'
    DONE = 'DONE'

