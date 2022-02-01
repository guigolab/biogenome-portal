from flask import request
from flask import current_app as app
from db.models import Organism
from flask_restful import Resource
import services.taxon_service as service
from errors import InternalServerError
from flask import Response, request
import xml.etree.ElementTree as ET
import json

class InputDataApi(Resource):
    def get(self, value):
        submission_file = service.create_submission_xml(value)
        return Response(ET.tostring(submission_file), mimetype='application/xml', status=200)
    
    def post(self):
        try:
            data = request.get_json()
            sample_xml = service.create_xml(data)
            return Response(ET.tostring(sample_xml), mimetype='application/xml', status=200)
        except Exception as e:
            app.logger.error(e)
        raise InternalServerError

#Endpoint to drop db collections
    def delete(self):
        pipeline = [
            {"$lookup":
                 {"from": "secondary_organism",
                  "localField": "records",
                  "foreignField": "_id",
                  "as": "records",
                  }
             },
             {"$lookup":
                 {"from": "experiment",
                  "localField": "experiments",
                  "foreignField": "_id",
                  "as": "experiments",
                  }
             },
             {"$lookup":
                 {"from": "assembly",
                  "localField": "assemblies",
                  "foreignField": "_id",
                  "as": "assemblies",
                  }
             },
             {"$lookup":
                 {"from": "taxon_node",
                  "localField": "taxon_lineage",
                  "foreignField": "_id",
                  "as": "taxon_lineage",
                  }
             },
             {
                "$project": {
                    "_id":0, 
                    "records": {"_id":0,"assemblies":0,"experiments":0,"specimens":0},
                    "taxon_lineage" : {"_id":0,"children":0},
                    "assemblies" : {"_id":0},
                    "experiments": {"_id":0}
                }
             }
            ]
        app.logger.info(json.dumps(Organism.objects(taxid='67940').aggregate(*pipeline).next()))
        # Organism._get_collection().drop_index('organism_text_commonName_text_taxid_text')
        # app.logger.info(Organism.objects.search_text('ara'))
        # app.logger.info(Organism._get_collection().index_information())
        # TaxonNode.drop_collection()
        # SecondaryOrganism.drop_collection()
        # Organism.drop_collection()
        # Assembly.drop_collection()
        # Experiment.drop_collection()
        return 200