from flask import Response,request
from db.models import Assembly,Annotation, BioGenomeUser,BioSample, GeoCoordinates,LocalSample,Experiment,Organism, TaxonNode
from flask_restful import Resource
from services import statistics_service
import json

MODEL_LIST = {
    'assemblies':Assembly,
    'taxons': TaxonNode,
    'annotations':Annotation,
    'biosamples':BioSample,
    'local_samples':LocalSample,
    'experiments':Experiment,
    'organisms':Organism,
    'coordinates':GeoCoordinates,
    'users':BioGenomeUser
    }

class FieldStatsApi(Resource):
    def get(self, model):
        if model not in MODEL_LIST.keys() or 'field' not in request.args.keys():
            return 404
        db_model = MODEL_LIST[model]
        field = request.args['field']
        try:
            resp = db_model.objects.item_frequencies(field)
            status = 200
        except:
            resp = {'message': 'field not found'}
            status = 400
        return Response(json.dumps(resp, default=str),mimetype="application/json", status=status)



class StatsApi(Resource):
    def get(self):
        resp = dict()
        for key in MODEL_LIST:
            if MODEL_LIST[key].objects.count() > 0:
                resp[key] = MODEL_LIST[key].objects.count()
        return Response(json.dumps(resp, default=str),mimetype="application/json", status=200)




class OrganismStatsApi(Resource):
    def get(self):
        stats = statistics_service.get_statistics(**request.args)
        return Response(json.dumps(stats, default=str),mimetype="application/json", status=200)
