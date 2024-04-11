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
    def get(self, model, field):
        if model not in MODEL_LIST.keys():
            return 404
        db_model = MODEL_LIST[model]
        try:
            resp = db_model.objects.item_frequencies(field)
            print(resp)
            status = 200
        except:
            resp = {'message': 'field not found'}
            status = 400
        if None in resp:
            resp["No Value"] = resp[None]
            del resp[None]
        return Response(json.dumps(resp, default=str),mimetype="application/json", status=status)

class StatsApi(Resource):
    def get(self):
        resp = dict()
        for key in MODEL_LIST:
            if MODEL_LIST[key].objects.count() > 0:
                resp[key] = MODEL_LIST[key].objects.count()
        return Response(json.dumps(resp, default=str),mimetype="application/json", status=200)
