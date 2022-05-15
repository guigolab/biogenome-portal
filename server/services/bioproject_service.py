from db.models import BioProject

def create_bioprojects(bioprojects):
    ##first save all bioprojects
    saved_bioprojects=list()
    for projects_container in bioprojects:
        for bioproject in projects_container['bioprojects']:
            saved_pr = BioProject.objects(accession=bioproject['accession']).first()
            if not saved_pr:
                saved_pr = BioProject(accession = bioproject['accession'], title=bioproject['title']).save()
            saved_bioprojects.append(saved_pr)
    ##then set relationship
    for projects_container in bioprojects:
        for bioproject in projects_container['bioprojects']:
            if 'parent_accessions' in bioproject.keys():
                project_obj = next(p for p in saved_bioprojects if p.accession == bioproject['accession'])
                for p_acc in bioproject['parent_accessions']:
                    parent_project = BioProject.objects(accession=p_acc).first()
                    project_obj.modify(add_to_set__parents=parent_project)
    #                 project_obj.parents.append(BioProject.objects(accession = p_acc).first())
    return saved_bioprojects