from flask import Response, request
from db.models import  Organism, SecondaryOrganism,Assembly
from flask_restful import Resource
from errors import NotFound,SchemaValidationError,RecordAlreadyExistError,TaxonNotFoundError
from utils.utils import parse_sample_metadata
from utils import ena_client
from datetime import datetime
from services import sample_service
import services.submission_service as service
from flask_jwt_extended import jwt_required
from flask_jwt_extended import get_jwt_identity
from mongoengine.queryset.visitor import Q
from flask import current_app as app
from utils.constants import SamplePipeline,SamplePipelinePrivate
import json

#CRUD operations on sample
class SamplesApi(Resource):

    @jwt_required(optional=True)
    def get(self,accession=None):
        sample = SecondaryOrganism.objects((Q(accession=accession) | Q(tube_or_well_id=accession)))
        if len(sample) > 0:
            if(get_jwt_identity()):
                result = sample.aggregate(*SamplePipelinePrivate).next()
            else:
                result = sample.aggregate(*SamplePipeline).next()
            return Response(json.dumps(result),mimetype="application/json", status=200)
        else:
            raise NotFound

    @jwt_required()
    def delete(self):
        if 'ids' in request.args.keys() and len(request.args['ids'].split(',')) > 0:
            ids = request.args['ids'].split(',')
            resp = sample_service.delete_samples(ids)
            return Response(json.dumps(resp),mimetype="application/json", status=200)
        else:
            raise SchemaValidationError

    @jwt_required()
    def put(self,accession):
        data = request.json if request.is_json else request.form
        sample = SecondaryOrganism.objects((Q(accession=accession) | Q(tube_or_well_id=accession))).first()
        if not sample:
            raise NotFound
        elif not data:
            raise SchemaValidationError
        else:
            sample.update(**data)
            id = sample.tube_or_well_id
        return Response(json.dumps(f'sample with id {id} has been saved'),mimetype="application/json", status=200)
		#update sample

    @jwt_required()
    def post(self):
        data = request.json if request.is_json else request.form
        if 'taxid' in data.keys() and 'tube_or_well_id' in data.keys():
            id = data['tube_or_well_id']
            if len(SecondaryOrganism.objects(tube_or_well_id=id)) > 0:
                raise RecordAlreadyExistError
            else:
                #create local sample
                sample = service.create_sample(data)
                id = sample.tube_or_well_id
                return Response(json.dumps(f'sample with id {id} has been saved'),mimetype="application/json", status=201)
        else:
            raise SchemaValidationError
   

class BioSampleApi(Resource):
    @jwt_required()
    def post(self):
        data = request.json if request.is_json else request.form
        if 'taxid' in data.keys() and 'accession' in data.keys():
            taxid = str(data['taxid'])
            id = data['accession']
            if len(SecondaryOrganism.objects(Q(tube_or_well_id=id) | Q(accession=id))) > 0:
                raise RecordAlreadyExistError
            else:
                #import data from accession number
                metadata = parse_sample_metadata(data['characteristics'])
                metadata['accession'] = data['accession']
                metadata['taxid'] = taxid
                sample = service.create_sample(metadata)
                sample_service.get_reads([sample])
                assemblies = ena_client.parse_assemblies(sample.accession)
                if len(assemblies) > 0:
                    existing_assemblies=Assembly.objects(accession__in=[ass['accession'] for ass in assemblies])
                    if len(existing_assemblies) > 0:
                        assemblies= [ass for ass in assemblies if ass['accession'] not in [ex_as['accession'] for ex_as in existing_assemblies]]
                    if len(assemblies) > 0:
                        for ass in assemblies:
                            if not 'sample_accession' in ass.keys():
                                ass['sample_accession'] = sample.accession
                        app.logger.info(assemblies)
                        assemblies = Assembly.objects.insert([Assembly(**ass) for ass in assemblies])
                        organism = Organism.objects(taxid=sample.taxid).first()
                        if not organism:
                            raise TaxonNotFoundError
                        organism.assemblies.extend(assemblies)
                        organism.save()
                        sample.assemblies.extend(assemblies)
                        sample.last_checked=datetime.utcnow()
                        sample.save()
                return Response(json.dumps(f'sample with id {id} has been saved'),mimetype="application/json", status=201)
        else:
            raise SchemaValidationError

class GeoLocApi(Resource):
    ##get all samples with coordinates
    def get(self):
        return Response(json.dumps(sample_service.geoloc_samples()), mimetype="application/json", status=200)
 