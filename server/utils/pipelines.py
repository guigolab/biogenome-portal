
TaxonPipeline = [
	{"$lookup":
		{"from": "taxon_node",
		"localField": "children",
		"foreignField": "taxid",
		"as": "children",
		}
	},
	{"$project": 
		{"_id":0,
		"children":{
			"_id":0
		}}
	}
]

GeoCoordinatesPipeline= [
	{"$lookup":
		{"from": "secondary_organism",
		"localField": "biosamples",
		"foreignField": "_id",
		"as": "biosamples",
		}
	},
	# {'$unwind': '$biosamples'}, 
    # {'$sort': {'biosamples.scientific_name': 1}},
	{"$project": 
		{"_id":0,
		"properties": { 
			"biosamples" : {
				'$map': { 
					'input': '$biosamples', 
					'as': 'biosample', 
					'in': { 
						'accession': '$$biosample.accession',
						'tube_or_well_id': '$$biosample.tube_or_well_id',
						'scientific_name': '$$biosample.scientific_name',
					}
				},
			}
		},
		"geo_loc":1,
		"type":1,
		"geometry":1,
		}
	}
]

OrganismPipeline = [
	{"$lookup":
		{"from": "bio_samples",
		"localField": "biosamples",
		"foreignField": "accession",
		"as": "biosamples",
		}
	},
	{"$lookup":
		{"from": "local_samples",
		"localField": "local_samples",
		"foreignField": "local_id",
		"as": "local_samples",
		}
	},
	{"$lookup":
		{"from": "experiment",
		"localField": "experiments",
		"foreignField": "experiment_accession",
		"as": "experiments",
		}
	},
	{"$lookup":
		{"from": "assembly",
		"localField": "assemblies",
		"foreignField": "accession",
		"as": "assemblies",
		}
	},
	{"$lookup":
		{"from": "annotation",
		"localField": "annotations",
		"foreignField": "name",
		"as": "annotations",
		}
	},
	{"$lookup":
		{"from": "taxon_node",
		"localField": "taxon_lineage",
		"foreignField": "taxid",
		"as": "taxon_lineage",
		}
	},
	{"$lookup":
		{"from": "bio_projects",
		"localField": "bioprojects",
		"foreignField": "accession",
		"as": "bioprojects",
		}
	},
	{"$project": 
		{"_id":0,
		"created":0,
		"biosamples":{
			"_id":0,
		},
		"local_samples":{
			"_id":0
		},
		"assemblies":{
			"_id":0
		},
		"experiments":{
			"_id":0
		},
		"annotations":{
			"_id":0
		},
		# "insdc_samples": {"assemblies":0,"experiments":0,"specimens":0, "created":0,"last_check":0,},
		# "local_samples": {
        #     "assemblies":0,"experiments":0,"specimens":0, 
        #     "created":0, "last_check":0, "indigenous_rights_applicable":0,
        #     "regulatory_compliance":0,
        #     "associated_traditional_knowledge_applicable":0,"ethics_permits_mandatory":0,
        #     "sampling_permits_mandatory":0, "nagoya_permits_mandatory":0,
        #     "collector_orcid_id":0,"sample_coordinator_orcid_id":0},
		# "taxon_lineage" : 0,
		# "assemblies" : {"_id":0, "created":0},
		# "experiments": {"_id":0},
		# "annotations":{"_id":0}
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
		{
        "created":0,
        "last_check":0,
        "indigenous_rights_applicable":0,
        "associated_traditional_knowledge_applicable":0,
        "ethics_permits_mandatory":0,
        "sampling_permits_mandatory":0,
        "nagoya_permits_mandatory":0,
        "collector_orcid_id":0,
        "sample_coordinator_orcid_id":0,
        "regulatory_compliance":0,
		"specimens": { "_id":0,
            "assemblies":0,"experiments":0,"specimens":0, 
            "created":0, "last_check":0, "indigenous_rights_applicable":0,
            "associated_traditional_knowledge_applicable":0,"ethics_permits_mandatory":0,
            "sampling_permits_mandatory":0, "regulatory_compliance":0,"nagoya_permits_mandatory":0,
            "collector_orcid_id":0,"sample_coordinator_orcid_id":0},
		"assemblies" : {"_id":0,"created":0},
		"experiments": {"_id":0}
		}
	}
]
SamplePipelinePrivate = [
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
		{
        "created":0,
        "last_check":0,
		"assemblies" : {"_id":0, "created":0},
		"experiments": {"_id":0}
		
		}
	}
]