from flask_restful import Resource
from flask import Response, request
from . import bioprojects_service 
from db.models import BioProject,Organism,Experiment,Assembly,GenomeAnnotation,BioSample
from errors import NotFound
import json

class BioProjectsApi(Resource):
    def get(self):
        total, data = bioprojects_service.get_bioprojects(**request.args)
        json_resp = dict(total=total, data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp),mimetype="application/json", status=200)

class BioProjectApi(Resource):
    def get(self, accession):
        bioproject = BioProject.objects(accession=accession).first()
        if not bioproject:
            raise NotFound
        return Response(bioproject.to_json(), mimetype="application/json", status=200)

class BioProjectCoordinatesApi(Resource):
    def get(self,accession):
        bioproject = BioProject.objects(accession=accession).first()
        if not bioproject:
            raise NotFound
        items = bioprojects_service.get_bioproject_coordinates(bioproject)
        return Response(items.to_json(), mimetype="application/json", status=200)

class BioProjectCountriesApi(Resource):
    def get(self,accession):
        bioproject = BioProject.objects(accession=accession).first()
        if not bioproject:
            raise NotFound   
        frequencies = bioprojects_service.get_bioproject_countries(bioproject)  
        return Response(json.dumps(frequencies), mimetype="application/json", status=200)


class BioProjectChildrenApi(Resource):
    def get(self, accession):
        bioproject = BioProject.objects(accession=accession).first()
        if not bioproject:
            raise NotFound
        items = BioProject.objects(accession__in=bioproject.children).to_json()
        # bioprojects = list()
        # MODEL_LIST = {
        #     'assemblies':Assembly,
        #     'biosamples':BioSample,
        #     'reads':Experiment,
        #     }
        # for item in items:
        #     bp = dict()
        #     organisms = Organism.objects(bioprojects=item.accession)
        #     taxids = organisms.scalar('taxid')
        #     bp['organisms'] = organisms.count()
        #     for key in MODEL_LIST.keys():
        #         bp[key] = MODEL_LIST[key].objects(taxid__in=taxids).count()
        #     bp['accession'] = item.accession
        #     bp['title'] = item.title
        #     bioprojects.append(bp)
        return Response(items, mimetype="application/json", status=200)

