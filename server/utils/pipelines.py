
TaxonPipeline = [
	{"$lookup":
		{"from": "taxon_node",
		"localField": "children",
		"foreignField": "_id",
		"as": "children",
		}
	},
	{"$project": 
		{"_id":0}
	}
]

OrganismPipeline = [
	{"$lookup":
		{"from": "secondary_organism",
		"localField": "insdc_samples",
		"foreignField": "_id",
		"as": "insdc_samples",
		}
	},
	{"$lookup":
		{"from": "secondary_organism",
		"localField": "local_samples",
		"foreignField": "_id",
		"as": "local_samples",
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
		"created":0,
		"insdc_samples": {"_id":0,"assemblies":0,"experiments":0,"specimens":0, "created":0,"last_check":0,},
		"local_samples": { "_id":0,
            "assemblies":0,"experiments":0,"specimens":0, 
            "created":0, "last_check":0, "indigenous_rights_applicable":0,
            "regulatory_compliance":0,
            "associated_traditional_knowledge_applicable":0,"ethics_permits_mandatory":0,
            "sampling_permits_mandatory":0, "nagoya_permits_mandatory":0,
            "collector_orcid_id":0,"sample_coordinator_orcid_id":0},
		"taxon_lineage" : 0,
		"assemblies" : {"_id":0, "created":0},
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
		"assemblies" : {"_id":0},
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
		{"_id":0, 
        "created":0,
        "last_check":0,
		"assemblies" : {"_id":0},
		"experiments": {"_id":0}

		}
	}
]