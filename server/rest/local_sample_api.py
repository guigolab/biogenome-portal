from flask import Response, request
# from db.models import  Organism, BioSample,Assembly,LocalSample
from flask_restful import Resource
# from errors import NotFound,SchemaValidationError,RecordAlreadyExistError,TaxonNotFoundError
# from utils.utils import parse_sample_metadata
# from utils import ena_client
# from datetime import datetime
from services import local_sample
# import services.submission_service as service
# from flask_jwt_extended import jwt_required
# from flask_jwt_extended import get_jwt_identity
# from mongoengine.queryset.visitor import Q
# from utils.pipelines import SamplePipeline,SamplePipelinePrivate
import json
# from flask import current_app as app

# #CRUD operations on sample
class LocalSampleApi(Resource):

    def get(self, local_id=None):
        return Response(local_sample.get_local_samples(**request.args), mimetype="application/json", status=200)

    def delete(self,local_id):
        deleted_local_id = local_sample.delete_local_sample(local_id)
        if deleted_local_id:
            return Response(json.dumps(deleted_local_id), mimetype="application/json", status=201)


#     @jwt_required(optional=True)
#     def get(self,accession):
#         sample = SecondaryOrganism.objects((Q(accession=accession) | Q(tube_or_well_id=accession)))
#         if sample:
#             if(get_jwt_identity()):
#                 result = sample.aggregate(*SamplePipelinePrivate).next()
#             else:
#                 result = sample.aggregate(*SamplePipeline).next()
#             result['_id'] = str(result['_id'])
#             app.logger.info(result)
#             return Response(json.dumps(result),mimetype="application/json", status=200)
#         raise NotFound
        
#     @jwt_required()
#     def delete(self):
#         if 'ids' in request.args.keys() and len(request.args['ids'].split(',')) > 0:
#             ids = request.args['ids'].split(',')
#             resp = sample_service.delete_samples(ids)
#             return Response(json.dumps(resp),mimetype="application/json", status=200)
#         else:
#             raise SchemaValidationError

#     @jwt_required()
#     def put(self,accession):
#         data = request.json if request.is_json else request.form
#         sample = SecondaryOrganism.objects((Q(accession=accession) | Q(tube_or_well_id=accession))).first()
#         if not sample:
#             raise NotFound
#         elif not data:
#             raise SchemaValidationError
#         else:
#             sample.update(**data)
#             id = sample.tube_or_well_id
#         return Response(json.dumps(f'sample with id {id} has been saved'),mimetype="application/json", status=200)

#     @jwt_required()
#     def post(self):
#         data = request.json if request.is_json else request.form
#         if 'taxid' in data.keys() and 'tube_or_well_id' in data.keys():
#             id = data['tube_or_well_id']
#             if len(SecondaryOrganism.objects(tube_or_well_id=id)) > 0:
#                 raise RecordAlreadyExistError
#             else:
#                 #create local sample
#                 sample = service.create_sample(data)
#                 id = sample.tube_or_well_id
#                 return Response(json.dumps(f'sample with id {id} has been saved'),mimetype="application/json", status=201)
#         else:
#             raise SchemaValidationError
   

# class BioSampleApi(Resource):
#     @jwt_required()
#     def post(self):
#         data = request.json if request.is_json else request.form
#         if 'taxid' in data.keys() and 'accession' in data.keys():
#             taxid = str(data['taxid'])
#             id = data['accession']
#             if len(SecondaryOrganism.objects(Q(tube_or_well_id=id) | Q(accession=id))) > 0:
#                 raise RecordAlreadyExistError
#             else:
#                 #import data from accession number
#                 metadata = parse_sample_metadata(data['characteristics'])
#                 metadata['accession'] = data['accession']
#                 metadata['taxid'] = taxid
#                 sample = service.create_sample(metadata)
#                 geo_loc_service.get_or_create_coordinates(sample)
#                 sample_service.get_reads([sample])
#                 assemblies = ena_client.parse_assemblies(sample.accession)
#                 if len(assemblies) > 0:
#                     existing_assemblies=Assembly.objects(accession__in=[ass['accession'] for ass in assemblies])
#                     if len(existing_assemblies) > 0:
#                         assemblies= [ass for ass in assemblies if ass['accession'] not in [ex_as['accession'] for ex_as in existing_assemblies]]
#                     if len(assemblies) > 0:
#                         for ass in assemblies:
#                             if not 'sample_accession' in ass.keys():
#                                 ass['sample_accession'] = sample.accession
#                         assemblies = Assembly.objects.insert([Assembly(**ass) for ass in assemblies])
#                         organism = Organism.objects(taxid=sample.taxid).first()
#                         if not organism:
#                             raise TaxonNotFoundError
#                         organism.assemblies.extend(assemblies)
#                         organism.save()
#                         sample.assemblies.extend(assemblies)
#                         sample.last_check=datetime.utcnow()
#                         sample.save()
#                 return Response(json.dumps(f'sample with id {id} has been saved'),mimetype="application/json", status=201)
#         else:
#             raise SchemaValidationError


# class GeoLocApi(Resource):
#     ##get all samples with coordinates
#     def get(self):
#         bioproject = request.args['bioproject'] if 'bioproject' in request.args.keys() else None
#         return Response(json.dumps(geo_loc_service.geoloc_samples(bioproject=bioproject)), mimetype="application/json", status=200)
    
#     ##post request to handle large collection of geo_loc ids (format: lat,loc string)
#     def post(self):
#         if request.is_json and 'ids' in request.json.keys(): 
#             ids = request.json['ids']
#         elif request.form and 'ids' in request.form.keys():
#             ids = request.form
#         else:
#             raise SchemaValidationError
#         return Response(json.dumps(geo_loc_service.get_geoloc_by_ids(ids)), mimetype="application/json", status=200)
