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
	{"$lookup":
		{"from": "bio_project",
		"localField": "bioprojects",
		"foreignField": "accession",
		"as": "bioprojects",
		}
	},
	{"$project": 
		{
		"_id":0,
		"biosamples":{
			"_id":0,
			"created":0
		},
		"annotations":{
			"_id":0,
			"created":0
		},
		"local_samples":{
			"_id":0,
			"created":0
		},
		"assemblies":{
			"_id":0,
			"created":0
		},
		"experiments":{
			"_id":0,
			"created":0
		},
		"bioprojects":{
			"_id":0,
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