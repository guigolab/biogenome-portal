from flask import Response,request
from db.models import Assembly,Annotation, BioGenomeUser,BioSample, GeoCoordinates,LocalSample,Experiment,Organism
from flask_restful import Resource
from services import statistics_service
import json

MODEL_LIST = {
    'assemblies':Assembly,
    'annotations':Annotation,
    'biosamples':BioSample,
    'local_samples':LocalSample,
    'experiments':Experiment,
    'organisms':Organism,
    'coordinates':GeoCoordinates,
    'users':BioGenomeUser
    }

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
