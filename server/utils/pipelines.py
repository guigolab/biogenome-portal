
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
		{"from": "bio_sample",
		"localField": "biosamples",
		"foreignField": "accession",
		"as": "biosamples",
		}
	},
	{"$lookup":
		{"from": "local_sample",
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
	## to mantain lineage order we query it after
	{"$lookup":
		{"from": "taxon_node",
		"localField": "taxon_lineage",
		"foreignField": "taxid",
		"as": "taxon_lineage",
		}
	},
	{"$lookup":
		{"from": "bio_project",
		"localField": "bioprojects",
		"foreignField": "accession",
		"as": "bioprojects",
		}
	},
	{"$project": 
		{
		"scientific_name":1,
		"taxid":1,
		"tolid_prefix":1,
		"coordinates":1,
		"insdc_status":1,
		"goat_status":1,
		"insdc_common_name":1,
		"publications_id":1,
		"biosamples":{
			"accession":1,
			"metadata":1,
			"latitude":1,
			"longitude":1,
			"sub_samples":1
		},
		"annotations":{
			"name":1,
			"metadata":1,
			"assembly_accession":1,
		},
		"local_samples":{
			"local_id":1,
			"metadata":1,
			"latitude":1,
			"longitude":1,
			"page_url":1
		},
		"assemblies":{
			"accession":1,
			"assembly_name":1,
			"metadata":1,
			"chromosomes":1
		},
		"experiments":{
			"experiment_accession":1,
			"metadata":1
		},
		"bioprojects":{
			"accession":1,
			"title":1
		},
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