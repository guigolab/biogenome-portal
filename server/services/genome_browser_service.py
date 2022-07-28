from db.models import AssemblyTrack,AnnotationTrack,Annotation,GenomeBrowserData
from services import assembly_service

ASSEMBLY_TRACK_FIELDS=['assembly_name','fasta_location','fai_location','gzi_location']
ANNOTATION_TRACK_FIELDS=['name','gff_gz_location','tab_index_location']
FIELDS = ['assembly_track','annotation_tracks']

def create_genome_browser_data(accession, data):
    resp=dict()
    genome_browser_data_obj = GenomeBrowserData(assembly_accession=accession).first()
    if genome_browser_data_obj:
        resp['message'] = f"{accession} already exists"
        resp['status'] = 400
        return resp
    assembly_obj=assembly_service.create_assembly_from_accession(accession)
    if not assembly_obj:
        resp['message'] = f'assembly with {accession} not found in INSDC'
        resp['status'] = 400
    #validate fields
    resp = validate_data(data)
    if resp:
        return resp
    assembly_track = AssemblyTrack(**data['assembly_track'])
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
        
    genome_browser_data_obj = GenomeBrowserData(assembly_accession=accession,assembly_track=assembly_track,annotation_tracks=annotation_tracks,taxid=assembly_obj.taxid).save()
    if not genome_browser_data_obj:
        resp['message'] = 'Unhandled error'
        resp['status'] = 500
        return resp
    
def validate_data(data):
    resp=dict()
    for field in FIELDS:
        if field not in data.keys():
            resp['message'] = f'{field} is mandatory'
            resp['status'] = 400
            return resp
        if field == 'assembly_track':
            for key in data[field].keys():
                if key not in ASSEMBLY_TRACK_FIELDS:
                    resp['message'] = f'{key} of {field} is mandatory'
                    resp['status'] = 400
                    return resp
        if field == 'annotation_tracks':
            for ann in data[field]:
                for key in ann.keys:
                    if key not in ANNOTATION_TRACK_FIELDS:
                        resp['message'] = f'{key} of {field} is mandatory'
                        resp['status'] = 400
                        return resp
    return 