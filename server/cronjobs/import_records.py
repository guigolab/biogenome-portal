##import data job
from .import_from_NCBI import import_from_NCBI
from .import_from_biosample import import_from_EBI_biosamples
import os

def import_records():
    PROJECTS = os.getenv('PROJECTS').split(',')
    print(PROJECTS)
    ACCESSION = os.getenv('PROJECT_ACCESSION')
    if ACCESSION and len(PROJECTS)>0 and PROJECTS[0] != '':
        import_from_NCBI(ACCESSION)
        import_from_EBI_biosamples(PROJECTS)
    elif ACCESSION:
        import_from_NCBI(ACCESSION)
    elif len(PROJECTS)>0:
        import_from_EBI_biosamples(PROJECTS)
        #check for samples between the past 15 days or recently created
    #get orphan samples (those without taxon and organism)
    #and retrieve taxons from sources