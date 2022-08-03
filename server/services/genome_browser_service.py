from db.models import AssemblyTrack,AnnotationTrack,Annotation,GenomeBrowserData
from errors import NotFound
from services.organism_service import get_or_create_organism
from services import assembly_service

ASSEMBLY_TRACK_FIELDS=['fasta_location','fai_location','gzi_location']
ANNOTATION_TRACK_FIELDS=['name','gff_gz_location','tab_index_location']
FIELDS = ['assembly_track','annotation_tracks','assembly_accession']

def create_genome_browser_data(data):
    resp = validate_data(data)
    if resp:
        return resp
    resp=dict()
    accession = data['assembly_accession']
    genome_browser_data_obj = GenomeBrowserData.objects(assembly_accession=accession).first()
    if genome_browser_data_obj:
        resp['message'] = f"{accession} already exists"
        resp['status'] = 400
        return resp
    assembly_obj=assembly_service.create_assembly_from_accession(accession)
    if not assembly_obj:
        resp['message'] = f'assembly with {accession} not found in INSDC'
        resp['status'] = 400
        return resp
    #validate fields
    assembly_track = AssemblyTrack(**data['assembly_track'])
    assembly_track.assembly_name = assembly_obj.assembly_name
    annotation_tracks = list()
    for ann_track in data['annotation_tracks']:
        annotation_tracks.append(AnnotationTrack(**ann_track))
        ##save annotation object
        annotation_name = ann_track['name']
        ann_obj= Annotation.objects(name=annotation_name).first()
        if ann_obj:
            resp['message'] = f"annotation with name: {annotation_name} already exists"
            resp['status'] = 400
            return resp
        links=[ann_track['gff_gz_location'],ann_track['tab_index_location']]
        metadata={'source':'local'}
        ann_obj = Annotation(name=annotation_name,taxid=assembly_obj.taxid,assembly_accession=accession,links=links,metadata=metadata).save()
        organism_obj = get_or_create_organism(assembly_obj.taxid)
        organism_obj.modify(add_to_set__annotations=ann_obj.name)
    genome_browser_data_obj = GenomeBrowserData(assembly_accession=accession,assembly_track=assembly_track,annotation_tracks=annotation_tracks,taxid=assembly_obj.taxid).save()
    if not genome_browser_data_obj:
        resp['message'] = 'Unhandled error'
        resp['status'] = 500
        return resp
    resp['message'] = f'{accession} correctly saved'
    resp['status'] = 201
    return resp
    
def validate_data(data):
    resp=dict()
    for field in FIELDS:
        if field not in data.keys():
            resp['message'] = f'{field} is mandatory'
            resp['status'] = 400
            return resp
        if field == 'assembly_track':
            for f in ASSEMBLY_TRACK_FIELDS:
                if f not in data[field].keys():
                    resp['message'] = f'{f} of {field} is mandatory'
                    resp['status'] = 400
                    return resp
        if field == 'annotation_tracks':
            for ann in data[field]:
                for key in ann.keys():
                    if key not in ANNOTATION_TRACK_FIELDS:
                        resp['message'] = f'{key} of {field} is mandatory'
                        resp['status'] = 400
                        return resp
    return 

def update_genome_browser_data(accession,data):
    genome_browser_data_obj = GenomeBrowserData.objects(assembly_accession=accession).first()
    if not genome_browser_data_obj:
        raise NotFound
    ##does this work in any case?
    genome_browser_data_obj.update(**data)
    return accession

def delete_genome_browser_data(accession):
    genome_browser_data_obj = GenomeBrowserData.objects(assembly_accession=accession).first()
    if not genome_browser_data_obj:
        raise NotFound
    for ann_track in genome_browser_data_obj.annotation_tracks:
        ann_obj = Annotation.objects(name=ann_track.name).first()
        if ann_obj:
            ann_obj.delete()
    genome_browser_data_obj.delete()
    return accession