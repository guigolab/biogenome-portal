from flask import Response,request
from db.models import Assembly,GenomeAnnotation,BioSample,LocalSample,Experiment,Organism,TaxonNode
from flask_restful import Resource
import json


MODEL_LIST = {
    'assemblies':Assembly,
    'annotations':GenomeAnnotation,
    'biosamples':BioSample,
    'local_samples':LocalSample,
    'experiments':Experiment,
    'organisms':Organism,
    'taxons':TaxonNode
    }

class FieldStatsApi(Resource):
    def get(self, model):
        if model not in MODEL_LIST.keys() or 'field' not in request.args.keys():
            return 404
        db_model = MODEL_LIST[model]
        field = request.args['field']
        query = request.args['query'] if 'query' in request.args.keys() else None
        try:
            query_obj = json.loads(query) if query else None
            if query_obj and query_obj.keys():
                resp = db_model.objects(**query_obj).item_frequencies(field)
            else:
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
