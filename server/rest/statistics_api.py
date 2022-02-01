from flask import Response,request
from werkzeug.datastructures import ContentSecurityPolicy
from flask_restful import Resource
import services.parser_service as service
from errors import InternalServerError
from flask import current_app as app
import json
from io import BytesIO
from db.models import Organism, TaxonNode,SecondaryOrganism, Experiment, Assembly, TrackStatus
import xml.etree.ElementTree as ET


class StatisticsApi(Resource):
    def get(self):
        experiments = Experiment.objects()
        organisms_with_assemblies = Organism.objects(trackingSystem= TrackStatus )
        m = Organism.objects(experiments__size=0)
        app.logger.info(m.as_pymongo().first())
        organisms_with_experiments = Organism.objects(experiments__size__gte=0)
        assemblies = Assembly.objects()
        organisms = Organism.objects()
        organisms_with_experiments = Organism.objects()
        samples = SecondaryOrganism.objects()