import os

CHECKLIST_FIELD_GROUPS = [
        {'fields': [
            {'label': 'organism part','model':'organism_part', 'description': "The part of organism's anatomy or substance arising from an organism from which the biomaterial was derived, excludes cells.", 'type': 'text_choice_field', 'mandatory': 'mandatory', 'multiplicity': 'single', 'options': ['WHOLE_ORGANISM', 'HEAD', 'THORAX', 'ABDOMEN', 'CEPHALOTHORAX', 'BRAIN', 'EYE', 'FAT_BODY', 'INTESTINE', 'BODYWALL', 'TERMINAL_BODY', 'ANTERIOR_BODY', 'MID_BODY', 'POSTERIOR_BODY', 'HEPATOPANCREAS', 'LEG', 'BLOOD', 'LUNG', 'HEART', 'KIDNEY', 'LIVER', 'ENDOCRINE_TISSUE', 'SPLEEN', 'STOMACH', 'PANCREAS', 'MUSCLE', 'MODULAR_COLONY', 'TENTACLE', 'FIN', 'SKIN', 'SCAT', 'EGGSHELL', 'SCALES', 'MOLLUSC_FOOT', 'HAIR', 'GILL_ANIMAL', '**OTHER_SOMATIC_ANIMAL_TISSUE**', 'OVIDUCT', 'GONAD', 'OVARY_ANIMAL', 'TESTIS', 'SPERM_SEMINAL_FLUID', 'EGG', '**OTHER_REPRODUCTIVE_ANIMAL_TISSUE**', 'WHOLE_PLANT', 'SEEDLING', 'SEED', 'LEAF', 'FLOWER', 'BLADE', 'STEM', 'PETIOLE', 'SHOOT', 'BUD', 'THALLUS_PLANT', 'BRACT', '**OTHER_PLANT_TISSUE**', 'MYCELIUM', 'MYCORRHIZA', 'SPORE_BEARING_STRUCTURE', 'HOLDFAST_FUNGI', 'STIPE', 'CAP', 'GILL_FUNGI', 'THALLUS_FUNGI', 'SPORE', '**OTHER_FUNGAL_TISSUE**', 'NOT_COLLECTED', 'NOT_APPLICABLE', 'NOT_PROVIDED', 'UNICELLULAR_ORGANISMS_IN_CULTURE', 'MULTICELLULAR_ORGANISMS_IN_CULTURE']}, 
            {'label': 'lifestage','model':'lifestage', 'description': 'the age class or life stage of the organism at the time of collection.', 'options': ['adult', 'egg', 'embryo', 'gametophyte', 'juvenile', 'larva', 'not applicable', 'not collected', 'not provided', 'pupa', 'spore-bearing structure', 'sporophyte', 'vegetative cell', 'vegetative structure', 'zygote'], 'type': 'text_choice_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}
        ], 
        'name': 'Part and developmental stage of organism', 
        'description': 'Anatomical and developmental descriptions of the sample site or source material'},
        
        {'fields': [
            {'label': 'project name','model':'project_name', 'description': 'Name of the project within which the sequencing was organized', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'tolid', 'model': 'tolid','description': 'A ToLID (Tree of Life ID) is a unique and easy to communicate sample identifier that provides species recognition, differentiates between specimen of the same species and adds taxonomic context. ToLIDs are endorsed by the EarthBioGenome Project (EBP) and should be assigned to any sample with association to the EBP. More information at id.tol.sanger.ac.uk.', 'regex': '(^[a-z]{1}[A-Z]{1}[a-z]{2}[A-Z]{1}[a-z]{2}[0-9]*$)|(^[a-z]{2}[A-Z]{1}[a-z]{2}[A-Z]{1}[a-z]{3}[0-9]*$)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'barcoding center', 'model':'barcoding_center','description': 'Center where DNA barcoding was/will be performed.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ],
        'name': 'Non-sample terms'},
        
        {'fields': [
            {'label': 'collected by', 'model': 'collected_by', 'description': 'name of persons or institute who collected the specimen', 'type': 'text_area_field', 'mandatory': 'mandatory', 'multiplicity': 'single'},
            {'label': 'collector ORCID ID','model': 'collector_orcid_id', 'description':'Enter the 16 digits ORCID ID of the person or people who is responsible for the genome project of the sample','type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'},
            {'label': 'date of collection','model': 'collection_date', 'description': 'The date of sampling, either as an instance (single point in time) or interval. In case no exact time is available, the date/time can be right truncated i.e. all of these are valid ISO8601 compliant times: 2008-01-23T19:23:10+00:00; 2008-01-23T19:23:10; 2008-01-23; 2008-01; 2008.', 'regex': '(^[12][0-9]{3}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01])(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?(/[0-9]{4}(-[0-9]{2}(-[0-9]{2}(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?)?$)|(^not collected$)|(^not provided$)|(^restricted access$)', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'time of collection','model': 'time_of_collection', 'description': 'Time of day of sample collection in 24-hour clock format, with hours and minutes separated by colon e.g., 13:35, 04:53, etc. This should be in GMT/UTC. This field may be particularly relevant for RNAseq', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'description of collection method','model': 'description_of_collection_method', 'description': 'A detailed as possible description of the sample collection methods, e.g., “caught with fibre net within densely wooded area, and immediately placed into the collection container', 'type': 'text_area_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'geographic location (country and/or sea)', 'model':'geographic_location_country','description': 'The geographical origin of the sample as defined by the country or sea. Country or sea names should be chosen from the INSDC country list (http://insdc.org/country.html).', 'options': ['Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antarctica', 'Antigua and Barbuda', 'Arctic Ocean', 'Argentina', 'Armenia', 'Aruba', 'Ashmore and Cartier Islands', 'Atlantic Ocean', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Baker Island', 'Baltic Sea', 'Bangladesh', 'Barbados', 'Bassas da India', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia', 'Borneo', 'Bosnia and Herzegovina', 'Botswana', 'Bouvet Island', 'Brazil', 'British Virgin Islands', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Cayman Islands', 'Central African Republic', 'Chad', 'Chile', 'China', 'Christmas Island', 'Clipperton Island', 'Cocos Islands', 'Colombia', 'Comoros', 'Cook Islands', 'Coral Sea Islands', 'Costa Rica', "Cote d'Ivoire", 'Croatia', 'Cuba', 'Curacao', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Europa Island', 'Falkland Islands (Islas Malvinas)', 'Faroe Islands', 'Fiji', 'Finland', 'France', 'French Guiana', 'French Polynesia', 'French Southern and Antarctic Lands', 'Gabon', 'Gambia', 'Gaza Strip', 'Georgia', 'Germany', 'Ghana', 'Gibraltar', 'Glorioso Islands', 'Greece', 'Greenland', 'Grenada', 'Guadeloupe', 'Guam', 'Guatemala', 'Guernsey', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Heard Island and McDonald Islands', 'Honduras', 'Hong Kong', 'Howland Island', 'Hungary', 'Iceland', 'India', 'Indian Ocean', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Isle of Man', 'Israel', 'Italy', 'Jamaica', 'Jan Mayen', 'Japan', 'Jarvis Island', 'Jersey', 'Johnston Atoll', 'Jordan', 'Juan de Nova Island', 'Kazakhstan', 'Kenya', 'Kerguelen Archipelago', 'Kingman Reef', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Martinique', 'Mauritania', 'Mauritius', 'Mayotte', 'Mediterranean Sea', 'Mexico', 'Micronesia', 'Midway Islands', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Montserrat', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Navassa Island', 'Nepal', 'Netherlands', 'New Caledonia', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'Norfolk Island', 'North Korea', 'North Sea', 'Northern Mariana Islands', 'Norway', 'Oman', 'Pacific Ocean', 'Pakistan', 'Palau', 'Palmyra Atoll', 'Panama', 'Papua New Guinea', 'Paracel Islands', 'Paraguay', 'Peru', 'Philippines', 'Pitcairn Islands', 'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Republic of the Congo', 'Reunion', 'Romania', 'Ross Sea', 'Russia', 'Rwanda', 'Saint Helena', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Pierre and Miquelon', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Sint Maarten', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Georgia and the South Sandwich Islands', 'South Korea', 'Southern Ocean', 'Spain', 'Spratly Islands', 'Sri Lanka', 'Sudan', 'Suriname', 'Svalbard', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Tasman Sea', 'Thailand', 'Togo', 'Tokelau', 'Tonga', 'Trinidad and Tobago', 'Tromelin Island', 'Tunisia', 'Turkey', 'Turkmenistan', 'Turks and Caicos Islands', 'Tuvalu', 'USA', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Viet Nam', 'Virgin Islands', 'Wake Island', 'Wallis and Futuna', 'West Bank', 'Western Sahara', 'Yemen', 'Zambia', 'Zimbabwe', 'not applicable', 'not collected', 'not provided', 'restricted access'], 'type': 'text_choice_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'geographic location (region and locality)','model':'geographic_location_region_and_locality', 'description': 'The geographical origin of the sample as defined by the specific region name followed by the locality name.', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'},
            {'label': 'geographic location (latitude)','model':'geographic_location_latitude', 'description': 'The geographical origin of the sample as defined by latitude and longitude. The values should be reported in decimal degrees and in WGS84 system', 'units': 'DD', 'regex': '(^[+-]?[0-9]+.?[0-9]{0,8}$)|(^not collected$)|(^not provided$)|(^restricted access$)', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'geographic location (longitude)','model':'geographic_location_longitude', 'description': 'The geographical origin of the sample as defined by latitude and longitude. The values should be reported in decimal degrees and in WGS84 system', 'units': 'DD', 'regex': '(^[+-]?[0-9]+.?[0-9]{0,8}$)|(^not collected$)|(^not provided$)|(^restricted access$)', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'grid reference','model':'grid_reference', 'description': 'Information to geolocate the sample area, preferably with a map or standardised geolocation reference, e.g., OS GRID REF: SP45998 08751. https://osmaps.ordnancesurvey.co.uk/ is useful to map lat-long to grid references', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 

            {'label': 'identified by','model':'identified_by', 'description': 'name of the expert who identified the specimen taxonomically', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'identified how','model': 'identified_how', 'description': 'Indicate what method(s) were used to identify the specimen to the nominal species (e.g., morphology, ITS barcoding)', 'type': 'text_area_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 

            {'label': 'geographic location (depth)','model':'geographic_location_depth', 'description': 'Depth is defined as the vertical distance below surface, e.g. for sediment or soil samples depth is measured from sediment or soil surface, respectivly. Depth can be reported as an interval for subsurface samples.', 'units': 'm', 'regex': '(0|((0\\.)|([1-9][0-9]*\\.?))[0-9]*)([Ee][+-]?[0-9]+)?', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'geographic location (elevation)','model':'geographic_location_elevation', 'description': 'The elevation of the sampling site as measured by the vertical distance from mean sea level.', 'units': 'm', 'regex': '[+-]?(0|((0\\.)|([1-9][0-9]*\\.?))[0-9]*)([Ee][+-]?[0-9]+)?', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'habitat', 'model': 'habitat','description': 'description of the location of the sample material. please use EnvO terms where possible: https://www.ebi.ac.uk/ols/ontologies/envo', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'identifier affiliation', 'model': 'identifier_affiliation' ,'description': 'the university, institution, or society responsible for identifying the specimen.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'original collection date','model':'original_collection_date', 'description': 'For use if the specimen is from a zoo, botanic garden, culture collection etc. and has a known original date of collection. In case no exact time is available, the date/time can be right truncated i.e. all of these are valid ISO8601 compliant times: 2008-01-23T19:23:10+00:00; 2008-01-23T19:23:10; 2008-01-23; 2008-01; 2008.', 'regex': '^[12][0-9]{3}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01])(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?(/[0-9]{4}(-[0-9]{2}(-[0-9]{2}(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?)?$', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'original geographic location','model':'original_geographic_location', 'description': 'For use if the specimen is from a zoo, botanic garden or culture collection etc. and has a known origin elsewhere. Please record the general description of the original collection location. This should be formatted as a country and optionally include more specific locations ranging from least to most specific separated by a | character, e.g. “United Kingdom | East Anglia | Norfolk | Norwich | University of East Anglia | UEA Broad".', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ], 
        'name': 'Collection event information'},

        {'fields': [
            {'label': 'sample derived from','model':'sample_derived_from', 'description': 'Reference to parental sample(s) or original run(s) that the assembly is derived from. The referenced samples or runs should already be registered in INSDC. This should be formatted as one of the following. A single sample/run e.g. ERSxxxxxx OR a comma separated list e.g. ERSxxxxxx,ERSxxxxxx OR a range e.g. ERSxxxxxx-ERSxxxxxx', 'regex': '(^[ESD]R[SR]\\d{6,}(,[ESD]R[SR]\\d{6,})*$)|(^SAM[END][AG]?\\d+(,SAM[END][AG]?\\d+)*$)|(^EGA[NR]\\d{11}(,EGA[NR]\\d{11})*$)|(^[ESD]R[SR]\\d{6,}-[ESD]R[SR]\\d{6,}$)|(^SAM[END][AG]?\\d+-SAM[END][AG]?\\d+$)|(^EGA[NR]\\d{11}-EGA[NR]\\d{11}$)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'sample same as','model':'sample_same_as', 'description': 'Reference to sample(s) that are equivalent. The referenced sample(s) should already be registered in INSDC. This should be formatted as one of the following. A single sample e.g. ERSxxxxxx OR a comma separated list e.g. ERSxxxxxx,ERSxxxxxx', 'regex': '(^[ESD]RS\\d{6,}(,[ESD]RS\\d{6,})*$)|(^SAM[END][AG]?\\d+(,SAM[END][AG]?\\d+)*$)|(^EGAN\\d{11}(,EGAN\\d{11})*$)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'sample symbiont of','model':'sample_symbiont_of', 'description': 'Reference to host sample from symbiont. The referenced sample should already be registered in INSDC. E.g. ERSxxxxxx', 'regex': '(^[ESD]RS\\d{6,}$)|(^SAM[END][AG]?\\d+$)|(^EGAN\\d{11}$)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'sample coordinator','model':'sample_coordinator', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'},
            {'label': 'sample coordinator affiliation', 'model':'sample_coordinator_affiliation','type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'sample coordinator orcid id', 'model':'sample_coordinator_orcid_id','description':'Enter the 16 digits ORCID ID of the person or people who is responsible for the genome project of the sample','type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'},

        ], 
        'name': 'Sample collection'}, 
        {'fields': [
            {'label': 'preserved by','model': 'preserved_by','description':'Name of person that carried out the preservation, supplied in CAPITALS. Multiple preserver names should be separated by a | character', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'preserver affiliation', 'model':'preserver_affiliation','type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'preserveration approach','model':'preservation_approach', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'preservative_solution','model':'preservative_solution','description':'Suspension liquid used to preserve the sample, e.g., RNALater, RLT Buffer, DESS', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'barcode plate preservative','model': 'barcode_plate_preservative','description':'Typically, animal samples will be submerged in 70% ethanol, plant tissue will be preserved in silica gel, and fungal tissue will be frozen or lyophilized. Record the volume, concentration, and type of preservative/method of preservation used here', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'time elapsed from collection preservation','model': 'time_elapsed_from_collection_preservation','type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'date of preservation', 'model': 'date_of_preservation', 'description':'Date on which the species was preserved. Please use YYYY-MM-DD format','type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
        ], 
        'name': 'Sample preservation'}, 

        {'fields': [
            {'label': 'sex','model':'sex', 'description': 'sex of the organism from which the sample was obtained', 'type': 'text_choice_field', 'mandatory': 'mandatory', 'multiplicity': 'single','options': ['FEMALE', 'MALE','HERMAPHRODITE_MONOECIOUS','NOT_COLLECTED','NOT_APPLICABLE','NOT_PROVIDED','ASEXUAL_MORPH','SEXUAL_MORPH']}, 
            {'label': 'relationship','model': 'relationship', 'description': 'indicates if the specimen has a known parental, child, or sibling relationship to any other specimens.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'symbiont','model':'symbiont', 'description': "Used to separate host and symbiont metadata within a symbiont system where the host species are indicated as 'N' and symbionts are indicated as 'Y'", 'options': ['N', 'Y'], 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ], 
        'name': 'Organism characteristics', 
        'description': 'Characteristics of the source organism'},

        {'fields': [
            {'label': 'collecting institution','model':'collecting_institution', 'description': 'Name of the institution to which the person collecting the specimen belongs. Format: Institute Name, Institute Address', 'type': 'text_area_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'GAL', 'model':'GAL', 'description': 'the name (or acronym) of the genome acquisition lab responsible for the sample.', 'options': ['Centro Nacional de Análisis Genómico', 'DNA Sequencing and Genomics Laboratory, Helsinki Genomics Core Facility', 'Dalhousie University', 'Dresden-concept', 'Earlham Institute', 'Functional Genomics Center Zurich', 'GIGA-Genomics Core Facility, University of Liege', 'Genoscope', 'Geomar Helmholtz Centre', 'Lausanne Genomic Technologies Facility', 'Marine Biological Association', 'NGS Bern', 'NGS Competence Center Tübingen', 'Natural History Museum', 'Neuromics Support Facility, UAntwerp, VIB', 'Norwegian Sequencing Centre', 'Nova Southeastern University', 'Portland State University', 'Queen Mary University of London', 'Royal Botanic Garden Edinburgh', 'Royal Botanic Gardens Kew', 'Sanger Institute', 'SciLifeLab', 'Senckenberg Research Institute', 'The Sainsbury Laboratory', 'University of Bari', 'University of British Columbia', 'University of California', 'University of Cambridge', 'University of Derby', 'University of Edinburgh', 'University of Florence', 'University of Oregon', 'University of Oxford', 'University of Rhode Island', 'University of Vienna (Cephalopod)', 'University of Vienna (Mollusc)', 'West German Genome Centre'], 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ], 
        'name': 'General collection event information', 
        'description': 'General information on the collection event.'}, 
        
        {'fields': [
            {'label': 'specimen voucher', 'model':'specimen_voucher','description': 'Unique identifier that references the physical specimen that remains after the sequence has been obtained and that ideally exists in a curated collection.', 'type': 'text_field', 'mandatory': 'recommended', 'multiplicity': 'single'}, 
            {'label': 'GAL sample id','model': 'GAL_sample_id', 'description': 'unique name assigned to the sample by the genome acquisition lab.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'collector sample id','model': 'collector_sample_id', 'description': 'unique name assigned to the sample by the COLLECTOR or COLLECTOR_AFFILIATION.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'specimen id','model': 'specimen_id', 'description': 'Unique identifier used to link all data for the recorded specimen.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'tube or well id for barcoding','model': 'tube_or_well_id_for_barcoding', 'description': 'This is either the well number on a plate (there are 96 wells per tissue plate) OR the barcode/unique identifier on the tube containing the tissue sample', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'tissue voucher id for biobanking','model': 'tissue_voucher_id_for_biobanking', 'description': 'Accession number of frozen, biobanked material from the sequenced specimen. This ID should be prefixed by the name of the collection (e.g., ATCC:12345)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'dna voucher id for biobanking','model': 'dna_voucher_id_for_biobanking', 'description': 'Accession number of DNA biobanked from the sequenced specimen. This ID should be prefixed by the name of the collection (e.g. ATCC:12345)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'specimen id risk','model': 'specimen_id_risk', 'description': 'indicate if there is any risk that the SPECIMEN_ID provided does not reflect a single genetic entity OR the species names it has been submitted under', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['Y','N']}, 
        ], 
        'name': 'Pointer to physical material', 'description': 'References to sample or sample source material in physical resources'
        },
        {'fields': [
            {'label': 'difficult or high priority sample','model': 'difficult_or_high_priority_sample', 'description': 'species/samples that are difficult to collect (rare) or high priority to push through sequencing for any reason', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['HIGH_PRIORITY','DIFFICULT','NOT_APPLICABLE','NOT_PROVIDED','NOT_COLLECTED','FULL_CURATION']},
            {'label': 'size of tissue in tube','model': 'size_of_tissue_in_tube', 'description': 'how large is the sample in the tube.', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['VS','S','M','L','SINGLE_CELL','NOT_COLLECTED','NOT_APPLICABLE','NOT_PROVIDED']},
            {'label': 'tissue for barcoding','model': 'tissue_for_barcoding', 'description': 'what part of the organism was dissected for DNA barcoding (e.g. leg, soft-body tissue etc.). Muscle tissue is ideal for barcoding', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options': ['WHOLE_ORGANISM', 'HEAD', 'THORAX', 'ABDOMEN', 'CEPHALOTHORAX', 'BRAIN', 'EYE', 'FAT_BODY', 'INTESTINE', 'BODYWALL', 'TERMINAL_BODY', 'ANTERIOR_BODY', 'MID_BODY', 'POSTERIOR_BODY', 'HEPATOPANCREAS', 'LEG', 'BLOOD', 'LUNG', 'HEART', 'KIDNEY', 'LIVER', 'ENDOCRINE_TISSUE', 'SPLEEN', 'STOMACH', 'PANCREAS', 'MUSCLE', 'MODULAR_COLONY', 'TENTACLE', 'FIN', 'SKIN', 'SCAT', 'EGGSHELL', 'SCALES', 'MOLLUSC_FOOT', 'HAIR', 'GILL_ANIMAL', '**OTHER_SOMATIC_ANIMAL_TISSUE**', 'OVIDUCT', 'GONAD', 'OVARY_ANIMAL', 'TESTIS', 'SPERM_SEMINAL_FLUID', 'EGG', '**OTHER_REPRODUCTIVE_ANIMAL_TISSUE**', 'WHOLE_PLANT', 'SEEDLING', 'SEED', 'LEAF', 'FLOWER', 'BLADE', 'STEM', 'PETIOLE', 'SHOOT', 'BUD', 'THALLUS_PLANT', 'BRACT', '**OTHER_PLANT_TISSUE**', 'MYCELIUM', 'MYCORRHIZA', 'SPORE_BEARING_STRUCTURE', 'HOLDFAST_FUNGI', 'STIPE', 'CAP', 'GILL_FUNGI', 'THALLUS_FUNGI', 'SPORE', '**OTHER_FUNGAL_TISSUE**', 'NOT_COLLECTED', 'NOT_APPLICABLE', 'NOT_PROVIDED', 'UNICELLULAR_ORGANISMS_IN_CULTURE', 'MULTICELLULAR_ORGANISMS_IN_CULTURE','DNA_EXTRACT']},
            {'label': 'tissue removed from barcoding','model': 'tissue_removed_from_barcoding', 'description': 'Instructions for appropriate Molecular Barcoding SOPs has to be arranged by the species ambassador with the Barcoding partner , noting that barcoding requires materials in specific tube or plate types.', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['Y','N','NOT_COLLECTED','NOT_APPLICABLE','NOT_PROVIDED']}, 
            {'label': 'tissue for biobanking','model': 'tissue_for_biobanking', 'description': 'what part of the organism was dissected for biobanking (e.g. leg, soft-body tissue etc.)', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options': ['WHOLE_ORGANISM', 'HEAD', 'THORAX', 'ABDOMEN', 'CEPHALOTHORAX', 'BRAIN', 'EYE', 'FAT_BODY', 'INTESTINE', 'BODYWALL', 'TERMINAL_BODY', 'ANTERIOR_BODY', 'MID_BODY', 'POSTERIOR_BODY', 'HEPATOPANCREAS', 'LEG', 'BLOOD', 'LUNG', 'HEART', 'KIDNEY', 'LIVER', 'ENDOCRINE_TISSUE', 'SPLEEN', 'STOMACH', 'PANCREAS', 'MUSCLE', 'MODULAR_COLONY', 'TENTACLE', 'FIN', 'SKIN', 'SCAT', 'EGGSHELL', 'SCALES', 'MOLLUSC_FOOT', 'HAIR', 'GILL_ANIMAL', '**OTHER_SOMATIC_ANIMAL_TISSUE**', 'OVIDUCT', 'GONAD', 'OVARY_ANIMAL', 'TESTIS', 'SPERM_SEMINAL_FLUID', 'EGG', '**OTHER_REPRODUCTIVE_ANIMAL_TISSUE**', 'WHOLE_PLANT', 'SEEDLING', 'SEED', 'LEAF', 'FLOWER', 'BLADE', 'STEM', 'PETIOLE', 'SHOOT', 'BUD', 'THALLUS_PLANT', 'BRACT', '**OTHER_PLANT_TISSUE**', 'MYCELIUM', 'MYCORRHIZA', 'SPORE_BEARING_STRUCTURE', 'HOLDFAST_FUNGI', 'STIPE', 'CAP', 'GILL_FUNGI', 'THALLUS_FUNGI', 'SPORE', '**OTHER_FUNGAL_TISSUE**', 'NOT_COLLECTED', 'NOT_APPLICABLE', 'NOT_PROVIDED', 'UNICELLULAR_ORGANISMS_IN_CULTURE', 'MULTICELLULAR_ORGANISMS_IN_CULTURE']},
            {'label': 'dna removed from biobanking','model': 'dna_removed_from_biobanking', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['Y','N','NOT_COLLECTED','NOT_APPLICABLE','NOT_PROVIDED']},
            {'label': 'purpose of specimen','model': 'purpose_of_specimen', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['REFERENCE_GENOME','SHORT_READ_SEQUENCING','DNA_BARCODING_ONLY','RNA_SEQUENCING','PROXY_VOUCHERING_ONLY']},
            {'label': 'hazard group','model': 'hazard_group', 'description': 'If the specimen needs to be processed in a containment level 1,2, or 3 lab', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['HG1','HG2','HG3']},
            {'label': 'regulatory compliance','model': 'regulatory_compliance', 'description': 'Note that ERGA will not be able to process further any samples where N is entered', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['Y','N','NOT_APPLICABLE']},
            {'label': 'indigenous rights applicable','model': 'indigenous_rights_applicable', 'description': 'Mandatory information upon if indigenious rights are applicable to the sample/the species the sample was derived from', 'type': 'text_choice_field', 'mandatory': 'mandatory', 'multiplicity': 'single', 'options':['Y','N']},
            {'label': 'associated traditional knowledge applicable','model': 'associated_traditional_knowledge_applicable', 'description': 'Mandatory information upon if indigenious rights are applicable to the sample/the species the sample was derived from', 'type': 'text_choice_field', 'mandatory': 'mandatory', 'multiplicity': 'single', 'options':['Y','N']},
            {'label': 'ethics permits mandatory','model': 'ethics_permits_mandatory', 'description': 'Mandatory information upon if an ethics permit is needed to sample/sequence/voucher/biobank the sample/the species the sample was derived from', 'type': 'text_choice_field', 'mandatory': 'mandatory', 'multiplicity': 'single', 'options':['Y','N']},
            {'label': 'sampling permits mandatory', 'model': 'sampling_permits_mandatory', 'description': 'Mandatory information upon if sampling permits are needed to sample/sequence/voucher/biobank the sample/the species the sample was derived from', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['Y','N']},
            {'label': 'nagoya permits mandatory','model': 'nagoya_permits_mandatory', 'description': 'Mandatory information upon if a permit in compliance with the Nagoya Protocol on Access to Genetic Resources and the Fair and Equitable Sharing of Benefits Arising from their Utilization to the Convention on Biological Diversity is needed for the sample in question/the species the sample was derived from', 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single', 'options':['Y','N']},
            {'label': 'other informations','model': 'other_informations',  'description': 'further relevant information not captured by the other fields', 'type': 'text_area_field', 'mandatory': 'optional', 'multiplicity': 'single'},
        ],
        'name': 'Sample Informations',
        },
        {'fields': [
            {'label': 'taxon remarks','model': 'taxon_remarks', 'description': 'Free text to summarise any known issues with the mapping of TAXON_ID to SCIENTIFIC_NAME or add other taxon database identifiers here e.g.,EukRef. Here you can also comment on STRAIN availabilit', 'type': 'text_area_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'infraspecific epithet','model': 'infraspecific_epithet', 'description': 'Where the sample is from a formally named infraspecific taxon, give the infraspecific name here, with prefixes in the following format: ssp. (for subspecies), var. (for variety), cv. (for cultivar), br. (for breed)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'culture or strain id','model': 'culture_or_strain_id', 'description': 'living, culturable, named laboratory strain that sequenced material is derived from.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
        ], 
        'name': 'Infraspecies information', 'description': 'Formal and informal infraspecies taxonomic information'},
        {'fields': [
                {'label': 'taxon ID','model':'taxid', 'description':'The Taxon ID of the NCBI Taxonomy database, visit https://ena-docs.readthedocs.io/en/latest/faq/taxonomy_requests.html','type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'},
                {'label': 'common name','model':'common_name', 'description':'Vernacular name, if the species has one. If multiple names are required, separate names with a | (vertical pipe) character','type': 'text_area_field', 'mandatory': 'optional', 'multiplicity': 'single'},
                {'label': 'tube or well id','model': 'tube_or_well_id', 'description': 'This field should record the FluidX barcode for each tube in a rack (or each well in a plate, where relevant) if available, else the position of the well if submitted in a well plate or the label on the submitted tubes. If barcodes are entered, use a barcode scanner in advance of preparing samples to reduce errors, do not enter barcodes manually. IMPORTANT: this field will be the unique identifier to track the sample status when published', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'},
            ],
        'name': 'Submission Informations',
        }
    ]


IMPORT_OPTIONS = ['SKIP','UPDATE']
# RANKS = ['root','superkingdom','kingdom','phylum','subphylum','class','order','family','genus','species','subspecies']

RANKS = os.getenv('RANKS').split(',')
#ERGA SAMPLE MANIFEST_V1 HEADER
MANIFEST_HEADER=['TUBE_OR_WELL_ID', 'SAMPLE_COORDINATOR', 'SAMPLE_COORDINATOR_AFFILIATION', 'SAMPLE_COORDINATOR_ORCID_ID', 'SPECIMEN_ID', 'ORDER_OR_GROUP', 'FAMILY', 'GENUS', 'TAXON_ID', 'SCIENTIFIC_NAME', 'TAXON_REMARKS', 'INFRASPECIFIC_EPITHET', 'CULTURE_OR_STRAIN_ID', 'COMMON_NAME', 'LIFESTAGE', 'SEX', 'ORGANISM_PART', 'SYMBIONT', 'RELATIONSHIP', 'GAL', 'GAL_SAMPLE_ID', 'COLLECTOR_SAMPLE_ID', 'COLLECTED_BY', 'COLLECTOR_AFFILIATION', 'COLLECTOR_ORCID_ID', 'DATE_OF_COLLECTION', 'COLLECTION_LOCATION', 'ORIGINAL_COLLECTION_DATE', 'ORIGINAL_GEOGRAPHIC_LOCATION', 'DECIMAL_LATITUDE', 'DECIMAL_LONGITUDE', 'GRID_REFERENCE', 'HABITAT', 'DEPTH', 'ELEVATION', 'TIME_OF_COLLECTION', 'DESCRIPTION_OF_COLLECTION_METHOD', 'DIFFICULT_OR_HIGH_PRIORITY_SAMPLE', 'IDENTIFIED_BY', 'IDENTIFIER_AFFILIATION', 'IDENTIFIED_HOW', 'SPECIMEN_ID_RISK', 'PRESERVED_BY', 'PRESERVER_AFFILIATION', 'PRESERVATION_APPROACH', 'PRESERVATIVE_SOLUTION', 'TIME_ELAPSED_FROM_COLLECTION_TO_PRESERVATION', 'DATE_OF_PRESERVATION', 'SIZE_OF_TISSUE_IN_TUBE', 'TISSUE_REMOVED_FOR_BARCODING', 'TUBE_OR_WELL_ID_FOR_BARCODING', 'TISSUE_FOR_BARCODING', 'BARCODE_PLATE_PRESERVATIVE', 'TISSUE_REMOVED_FOR_BIOBANKING', 'TISSUE_VOUCHER_ID_FOR_BIOBANKING', 'TISSUE_FOR_BIOBANKING', 'DNA_REMOVED_FOR_BIOBANKING', 'DNA_VOUCHER_ID_FOR_BIOBANKING', 'PURPOSE_OF_SPECIMEN', 'HAZARD_GROUP', 'REGULATORY_COMPLIANCE', 'VOUCHER_ID', 'INDIGENOUS_RIGHTS_APPLICABLE', 'INDIGENOUS_RIGHTS_DEF', 'ASSOCIATED_TRADITIONAL_KNOWLEDGE_APPLICABLE', 'ASSOCIATED_TRADITIONAL_KNOWLEDGE_LABEL', 'ASSOCIATED_TRADITIONAL_KNOWLEDGE_CONTACT', 'ETHICS_PERMITS_MANDATORY', 'ETHICS_PERMITS_DEF', 'SAMPLING_PERMITS_MANDATORY', 'SAMPLING_PERMITS_DEF', 'NAGOYA_PERMITS_MANDATORY', 'NAGOYA_PERMITS_DEF', 'OTHER_INFORMATION']


MANIFEST_TO_MODEL= {
    "collection_location": [
        "geographic_location_country",
        "geographic_location_region_and_locality"
    ],
    "collector_affiliation":["collecting_institution"],
    "taxon_id": ['taxid'],
    "decimal_longitude": ['geographic_location_longitude'],
    "decimal_latitude":['geographic_location_latitude'],
    "date_of_collection":['collection_date']
}

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
		"records": { "_id":0,
            "assemblies":0,"experiments":0,"specimens":0, 
            "created":0, "last_check":0, "indigenous_rights_applicable":0,
            "regulatory_compliance":0,
            "associated_traditional_knowledge_applicable":0,"ethics_permits_mandatory":0,
            "sampling_permits_mandatory":0, "nagoya_permits_mandatory":0,
            "collector_orcid_id":0,"sample_coordinator_orcid_id":0},
		"taxon_lineage" : {"_id":0,"children":0},
		"assemblies" : {"_id":0},
		"experiments": {"_id":0}
		}
	}
]

#pipeline for sample editing
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

