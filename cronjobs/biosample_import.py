from datetime import datetime
import os
from helpers import biosample_helper, taxonomy_helper, utils
from db.models import BioSample,Organism

PROJECTS = os.getenv('PROJECTS')

"""
STEPS:
    1) download all the biosamples under the project comma separated list variable PROJECTS 
    2) collect taxids and sample_accessions
    3) retrieve existing organisms
    4)

"""

def import_biosamples_from_bioproject_names():
    if not PROJECTS:
        return
    
    for p in PROJECTS.split(','):
        ebi_biosamples = biosample_helper.retrieve_biosamples_from_ebi_by_project(p.strip())
        taxids = set()
        ebi_biosample_accessions = []
        for ebi_biosample in ebi_biosamples:
            taxids.add(str(ebi_biosample['taxId']))
            ebi_biosample_accessions.append(ebi_biosample['accession'])
            
        existing_samples = utils.get_objects_by_scalar_id(BioSample,'accession',dict(accession__in=ebi_biosample_accessions))
        existing_organisms = utils.get_objects_by_scalar_id(Organism, 'taxid',dict(taxid__in=list(taxids)))
        new_organisms = [taxid for taxid in list(taxids) if not taxid in existing_organisms]
        organisms_lineage_tuples = taxonomy_helper.get_taxons_from_ena(new_organisms)
        utils.insert_data(Organism, [t[0] for t in organisms_lineage_tuples] )

        # taxonomy_helper.update_organisms(saved_biosamples,'add_to_set__biosamples')

        for lineage in [t[1] for t in organisms_lineage_tuples]:
            taxon_lineage = taxonomy_helper.create_taxons_from_lineage(lineage)
            for taxon in taxon_lineage:
                taxon.update(leaves=Organism.objects(taxon_lineage=taxon.taxid, taxid__ne=taxon.taxid).count())


if __name__ == "__main__":
    print(f"Running import_biosamples at {datetime.now()}")
    #import biosamples from project tags
