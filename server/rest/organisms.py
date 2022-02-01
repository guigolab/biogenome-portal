import services.search_service as service
from flask import Response, request
from db.models import Organism, SecondaryOrganism
from flask_restful import Resource
from mongoengine.errors import DoesNotExist
from errors import NotFound
from flask import current_app as app
import json

OrganismPipeline = [
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
	{"$project": 
		{"_id":0, 
		"records": {"_id":0,"assemblies":0,"experiments":0,"specimens":0},
		"taxon_lineage" : {"_id":0,"children":0},
		"assemblies" : {"_id":0},
		"experiments": {"_id":0}
		}
	}
]

SamplePipeline = [
	{"$lookup":
		{"from": "secondary_organism",
		"localField": "specimens",
		"foreignField": "_id",
		"as": "specimens",
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
	{"$project": 
		{"_id":0, 
		"specimens": {"_id":0,"assemblies":0,"experiments":0,"specimens":0},
		"assemblies" : {"_id":0},
		"experiments": {"_id":0}
		}
	}
]

class OrganismsApi(Resource):
	def get(self):
		try:
			return Response(service.default_query_params(request.args,Organism),mimetype="application/json", status=200)
		except DoesNotExist:
			raise NotFound

class OrganismsSearchApi(Resource):
	def get(self):
		try:
			return Response(service.full_text_search(request.args,Organism),mimetype="application/json", status=200)
		except DoesNotExist:
			raise NotFound

class OrganismApi(Resource):
	def get(self,name):
		organism = Organism.objects(organism=name).aggregate(*OrganismPipeline).next()
		if not organism:
			raise NotFound
		return Response(json.dumps(organism),mimetype="application/json", status=200)

class SampleApi(Resource):
	def get(self,accession):
		sample = SecondaryOrganism.objects(accession=accession).aggregate(*SamplePipeline).next()
		if not sample:
			raise NotFound
		return Response(json.dumps(sample),mimetype="application/json", status=200)


##endpoint to retrieve checklist fields
