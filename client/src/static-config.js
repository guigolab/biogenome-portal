module.exports = {
    checkList: 'ERC000053',
    experimentsParams : "study_accession,secondary_study_accession,sample_accession,secondary_sample_accession,experiment_accession,run_accession,submission_accession,tax_id,scientific_name,instrument_platform,instrument_model,library_name,nominal_length,library_layout,library_strategy,library_source,library_selection,read_count,base_count,center_name,first_public,last_updated,experiment_title,study_title,study_alias,experiment_alias,run_alias,fastq_bytes,fastq_md5,fastq_ftp,fastq_aspera,fastq_galaxy,submitted_bytes,submitted_md5,submitted_ftp,submitted_aspera,submitted_galaxy,submitted_format,sra_bytes,sra_md5,sra_ftp,sra_aspera,sra_galaxy,cram_index_ftp,cram_index_aspera,cram_index_galaxy,sample_alias,broker_name,sample_title,nominal_sdev,first_created",
    ENABrowser: "https://www.ebi.ac.uk/ena/browser/view/",

    // excelParser: {
    //     BARCODING_CENTER:'barcoding center',
    //     PROJECT_NAME:'project name',
    //     TOLID:'tolid',
    //     SPECIMEN_ID: 'specimen_id',
    //     TAXON_ID:'taxonId',
    //     SCIENTIFIC_NAME:'name',
    //     COMMON_NAME: 'common_name',
    //     CULTURE_OR_STRAIN_ID:'culture_or_strain_id',
    //     LIFESTAGE:'lifestage',
    //     SEX:'sex',
    //     ORGANISM_PART:'organism part',
    //     SYMBIONT:'symbiont',
    //     SAMPLE_SYMBIONT_OF:'sample symbiont of',
    //     RELATIONSHIP:'relationship',
    //     SAMPLE_DERIVED_FROM:'sample derived from',
    //     COLLECTED_BY:'collected_by',
    //     COLLECTING_INSTITUTION:'collecting institution',
    //     COLLECTION_DATE:'collection date',
    //     COLLECTION_COUNTRY_OR_SEA:'geographic location (country and/or sea)',
    //     COLLECTION_REGION_OR_LOCALITY:'geographic location (region and locality)',
    //     DECIMAL_LATITUDE:'geographic location (latitude)',
    //     DECIMAL_LONGITUDE:'geographic location (longitude)',
    //     HABITAT:'habitat',
    //     DEPTH:'geographic location (depth)',
    //     ELEVATION:'geographic location (elevation)',
    //     TIME_OF_COLLECTION:'original collection date',
    //     ORIGINAL_GEOGRAPHIC_LOCATION:'original geographic location',
    //     IDENTIFIED_BY:'identified_by',
    //     IDENTIFIER_AFFILIATION:'identifier_affiliation',
    // },
    options : {
        lifestageOptions: ['adult', 'egg', 'embryo', 'gametophyte', 'juvenile', 'larva', 'not applicable', 'not collected', 'not provided', 'pupa', 'spore-bearing structure', 'sporophyte', 'vegetative cell', 'vegetative structure', 'zygote'],
        countryOptions: ['Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antarctica', 'Antigua and Barbuda', 'Arctic Ocean', 'Argentina', 'Armenia', 'Aruba', 'Ashmore and Cartier Islands', 'Atlantic Ocean', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Baker Island', 'Baltic Sea', 'Bangladesh', 'Barbados', 'Bassas da India', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia', 'Borneo', 'Bosnia and Herzegovina', 'Botswana', 'Bouvet Island', 'Brazil', 'British Virgin Islands', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Cayman Islands', 'Central African Republic', 'Chad', 'Chile', 'China', 'Christmas Island', 'Clipperton Island', 'Cocos Islands', 'Colombia', 'Comoros', 'Cook Islands', 'Coral Sea Islands', 'Costa Rica', "Cote d'Ivoire", 'Croatia', 'Cuba', 'Curacao', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Europa Island', 'Falkland Islands (Islas Malvinas)', 'Faroe Islands', 'Fiji', 'Finland', 'France', 'French Guiana', 'French Polynesia', 'French Southern and Antarctic Lands', 'Gabon', 'Gambia', 'Gaza Strip', 'Georgia', 'Germany', 'Ghana', 'Gibraltar', 'Glorioso Islands', 'Greece', 'Greenland', 'Grenada', 'Guadeloupe', 'Guam', 'Guatemala', 'Guernsey', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Heard Island and McDonald Islands', 'Honduras', 'Hong Kong', 'Howland Island', 'Hungary', 'Iceland', 'India', 'Indian Ocean', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Isle of Man', 'Israel', 'Italy', 'Jamaica', 'Jan Mayen', 'Japan', 'Jarvis Island', 'Jersey', 'Johnston Atoll', 'Jordan', 'Juan de Nova Island', 'Kazakhstan', 'Kenya', 'Kerguelen Archipelago', 'Kingman Reef', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Martinique', 'Mauritania', 'Mauritius', 'Mayotte', 'Mediterranean Sea', 'Mexico', 'Micronesia', 'Midway Islands', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Montserrat', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Navassa Island', 'Nepal', 'Netherlands', 'New Caledonia', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'Norfolk Island', 'North Korea', 'North Sea', 'Northern Mariana Islands', 'Norway', 'Oman', 'Pacific Ocean', 'Pakistan', 'Palau', 'Palmyra Atoll', 'Panama', 'Papua New Guinea', 'Paracel Islands', 'Paraguay', 'Peru', 'Philippines', 'Pitcairn Islands', 'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Republic of the Congo', 'Reunion', 'Romania', 'Ross Sea', 'Russia', 'Rwanda', 'Saint Helena', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Pierre and Miquelon', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Sint Maarten', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Georgia and the South Sandwich Islands', 'South Korea', 'Southern Ocean', 'Spain', 'Spratly Islands', 'Sri Lanka', 'Sudan', 'Suriname', 'Svalbard', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Tasman Sea', 'Thailand', 'Togo', 'Tokelau', 'Tonga', 'Trinidad and Tobago', 'Tromelin Island', 'Tunisia', 'Turkey', 'Turkmenistan', 'Turks and Caicos Islands', 'Tuvalu', 'USA', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Viet Nam', 'Virgin Islands', 'Wake Island', 'Wallis and Futuna', 'West Bank', 'Western Sahara', 'Yemen', 'Zambia', 'Zimbabwe', 'not applicable', 'not collected', 'not provided', 'restricted access'],
        symbiontOptions: ['N', 'Y'],
        GALOptions: ['Centro Nacional de Análisis Genómico', 'DNA Sequencing and Genomics Laboratory, Helsinki Genomics Core Facility', 'Dalhousie University', 'Dresden-concept', 'Earlham Institute', 'Functional Genomics Center Zurich', 'GIGA-Genomics Core Facility, University of Liege', 'Genoscope', 'Geomar Helmholtz Centre', 'Lausanne Genomic Technologies Facility', 'Marine Biological Association', 'NGS Bern', 'NGS Competence Center Tübingen', 'Natural History Museum', 'Neuromics Support Facility, UAntwerp, VIB', 'Norwegian Sequencing Centre', 'Nova Southeastern University', 'Portland State University', 'Queen Mary University of London', 'Royal Botanic Garden Edinburgh', 'Royal Botanic Gardens Kew', 'Sanger Institute', 'SciLifeLab', 'Senckenberg Research Institute', 'The Sainsbury Laboratory', 'University of Bari', 'University of British Columbia', 'University of California', 'University of Cambridge', 'University of Derby', 'University of Edinburgh', 'University of Florence', 'University of Oregon', 'University of Oxford', 'University of Rhode Island', 'University of Vienna (Cephalopod)', 'University of Vienna (Mollusc)', 'West German Genome Centre'],
        
    },
    regexs: {
        tolid: '(^[a-z]{1}[A-Z]{1}[a-z]{2}[A-Z]{1}[a-z]{2}[0-9]*$)|(^[a-z]{2}[A-Z]{1}[a-z]{2}[A-Z]{1}[a-z]{3}[0-9]*$)',
        collectionDate: '(^[12][0-9]{3}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01])(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?(/[0-9]{4}(-[0-9]{2}(-[0-9]{2}(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?)?$)|(^not collected$)|(^not provided$)|(^restricted access$)',
        coordinates: '(^[+-]?[0-9]+.?[0-9]{0,8}$)|(^not collected$)|(^not provided$)|(^restricted access$)',  
        elevation: '(0|((0\\.)|([1-9][0-9]*\\.?))[0-9]*)([Ee][+-]?[0-9]+)?', //same for depth
        originalDate: '^[12][0-9]{3}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01])(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?(/[0-9]{4}(-[0-9]{2}(-[0-9]{2}(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?)?$',
    },
    checklistFieldGroups : [
        {'fields': [
            {'label': 'organism part', 'description': "The part of organism's anatomy or substance arising from an organism from which the biomaterial was derived, excludes cells.", 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'lifestage', 'description': 'the age class or life stage of the organism at the time of collection.', 'options': ['adult', 'egg', 'embryo', 'gametophyte', 'juvenile', 'larva', 'not applicable', 'not collected', 'not provided', 'pupa', 'spore-bearing structure', 'sporophyte', 'vegetative cell', 'vegetative structure', 'zygote'], 'type': 'text_choice_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}
        ], 
        'name': 'Part and developmental stage of organism', 
        'description': 'Anatomical and developmental descriptions of the sample site or source material'},
        
        {'fields': [
            {'label': 'project name', 'description': 'Name of the project within which the sequencing was organized', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'tolid', 'description': 'A ToLID (Tree of Life ID) is a unique and easy to communicate sample identifier that provides species recognition, differentiates between specimen of the same species and adds taxonomic context. ToLIDs are endorsed by the EarthBioGenome Project (EBP) and should be assigned to any sample with association to the EBP. More information at id.tol.sanger.ac.uk.', 'regex': '(^[a-z]{1}[A-Z]{1}[a-z]{2}[A-Z]{1}[a-z]{2}[0-9]*$)|(^[a-z]{2}[A-Z]{1}[a-z]{2}[A-Z]{1}[a-z]{3}[0-9]*$)', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'barcoding center', 'description': 'Center where DNA barcoding was/will be performed.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ],
        'name': 'non-sample terms'},
        
        {'fields': [
            {'label': 'collected_by', 'description': 'name of persons or institute who collected the specimen', 'type': 'text_area_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'collection date', 'description': 'The date of sampling, either as an instance (single point in time) or interval. In case no exact time is available, the date/time can be right truncated i.e. all of these are valid ISO8601 compliant times: 2008-01-23T19:23:10+00:00; 2008-01-23T19:23:10; 2008-01-23; 2008-01; 2008.', 'regex': '(^[12][0-9]{3}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01])(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?(/[0-9]{4}(-[0-9]{2}(-[0-9]{2}(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?)?$)|(^not collected$)|(^not provided$)|(^restricted access$)', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'geographic location (country and/or sea)', 'description': 'The geographical origin of the sample as defined by the country or sea. Country or sea names should be chosen from the INSDC country list (http://insdc.org/country.html).', 'options': ['Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antarctica', 'Antigua and Barbuda', 'Arctic Ocean', 'Argentina', 'Armenia', 'Aruba', 'Ashmore and Cartier Islands', 'Atlantic Ocean', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Baker Island', 'Baltic Sea', 'Bangladesh', 'Barbados', 'Bassas da India', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia', 'Borneo', 'Bosnia and Herzegovina', 'Botswana', 'Bouvet Island', 'Brazil', 'British Virgin Islands', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Cayman Islands', 'Central African Republic', 'Chad', 'Chile', 'China', 'Christmas Island', 'Clipperton Island', 'Cocos Islands', 'Colombia', 'Comoros', 'Cook Islands', 'Coral Sea Islands', 'Costa Rica', "Cote d'Ivoire", 'Croatia', 'Cuba', 'Curacao', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Europa Island', 'Falkland Islands (Islas Malvinas)', 'Faroe Islands', 'Fiji', 'Finland', 'France', 'French Guiana', 'French Polynesia', 'French Southern and Antarctic Lands', 'Gabon', 'Gambia', 'Gaza Strip', 'Georgia', 'Germany', 'Ghana', 'Gibraltar', 'Glorioso Islands', 'Greece', 'Greenland', 'Grenada', 'Guadeloupe', 'Guam', 'Guatemala', 'Guernsey', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Heard Island and McDonald Islands', 'Honduras', 'Hong Kong', 'Howland Island', 'Hungary', 'Iceland', 'India', 'Indian Ocean', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Isle of Man', 'Israel', 'Italy', 'Jamaica', 'Jan Mayen', 'Japan', 'Jarvis Island', 'Jersey', 'Johnston Atoll', 'Jordan', 'Juan de Nova Island', 'Kazakhstan', 'Kenya', 'Kerguelen Archipelago', 'Kingman Reef', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Martinique', 'Mauritania', 'Mauritius', 'Mayotte', 'Mediterranean Sea', 'Mexico', 'Micronesia', 'Midway Islands', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Montserrat', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Navassa Island', 'Nepal', 'Netherlands', 'New Caledonia', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'Norfolk Island', 'North Korea', 'North Sea', 'Northern Mariana Islands', 'Norway', 'Oman', 'Pacific Ocean', 'Pakistan', 'Palau', 'Palmyra Atoll', 'Panama', 'Papua New Guinea', 'Paracel Islands', 'Paraguay', 'Peru', 'Philippines', 'Pitcairn Islands', 'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Republic of the Congo', 'Reunion', 'Romania', 'Ross Sea', 'Russia', 'Rwanda', 'Saint Helena', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Pierre and Miquelon', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Sint Maarten', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Georgia and the South Sandwich Islands', 'South Korea', 'Southern Ocean', 'Spain', 'Spratly Islands', 'Sri Lanka', 'Sudan', 'Suriname', 'Svalbard', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Tasman Sea', 'Thailand', 'Togo', 'Tokelau', 'Tonga', 'Trinidad and Tobago', 'Tromelin Island', 'Tunisia', 'Turkey', 'Turkmenistan', 'Turks and Caicos Islands', 'Tuvalu', 'USA', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Viet Nam', 'Virgin Islands', 'Wake Island', 'Wallis and Futuna', 'West Bank', 'Western Sahara', 'Yemen', 'Zambia', 'Zimbabwe', 'not applicable', 'not collected', 'not provided', 'restricted access'], 'type': 'text_choice_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'geographic location (latitude)', 'description': 'The geographical origin of the sample as defined by latitude and longitude. The values should be reported in decimal degrees and in WGS84 system', 'units': 'DD', 'regex': '(^[+-]?[0-9]+.?[0-9]{0,8}$)|(^not collected$)|(^not provided$)|(^restricted access$)', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'geographic location (longitude)', 'description': 'The geographical origin of the sample as defined by latitude and longitude. The values should be reported in decimal degrees and in WGS84 system', 'units': 'DD', 'regex': '(^[+-]?[0-9]+.?[0-9]{0,8}$)|(^not collected$)|(^not provided$)|(^restricted access$)', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'geographic location (region and locality)', 'description': 'The geographical origin of the sample as defined by the specific region name followed by the locality name.', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'identified_by', 'description': 'name of the expert who identified the specimen taxonomically', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'geographic location (depth)', 'description': 'Depth is defined as the vertical distance below surface, e.g. for sediment or soil samples depth is measured from sediment or soil surface, respectivly. Depth can be reported as an interval for subsurface samples.', 'units': 'm', 'regex': '(0|((0\\.)|([1-9][0-9]*\\.?))[0-9]*)([Ee][+-]?[0-9]+)?', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'geographic location (elevation)', 'description': 'The elevation of the sampling site as measured by the vertical distance from mean sea level.', 'units': 'm', 'regex': '[+-]?(0|((0\\.)|([1-9][0-9]*\\.?))[0-9]*)([Ee][+-]?[0-9]+)?', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'habitat', 'description': 'description of the location of the sample material. please use EnvO terms where possible: https://www.ebi.ac.uk/ols/ontologies/envo', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'identifier_affiliation', 'description': 'the university, institution, or society responsible for identifying the specimen.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'original collection date', 'description': 'For use if the specimen is from a zoo, botanic garden, culture collection etc. and has a known original date of collection. In case no exact time is available, the date/time can be right truncated i.e. all of these are valid ISO8601 compliant times: 2008-01-23T19:23:10+00:00; 2008-01-23T19:23:10; 2008-01-23; 2008-01; 2008.', 'regex': '^[12][0-9]{3}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01])(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?(/[0-9]{4}(-[0-9]{2}(-[0-9]{2}(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?([+-][0-9]{1,2})?)?)?)?)?$', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'original geographic location', 'description': 'For use if the specimen is from a zoo, botanic garden or culture collection etc. and has a known origin elsewhere. Please record the general description of the original collection location. This should be formatted as a country and optionally include more specific locations ranging from least to most specific separated by a | character, e.g. “United Kingdom | East Anglia | Norfolk | Norwich | University of East Anglia | UEA Broad".', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ], 
        'name': 'Collection event information'},

        {'fields': [
            {'label': 'sample derived from', 'description': 'Reference to parental sample(s) or original run(s) that the assembly is derived from. The referenced samples or runs should already be registered in INSDC. This should be formatted as one of the following. A single sample/run e.g. ERSxxxxxx OR a comma separated list e.g. ERSxxxxxx,ERSxxxxxx OR a range e.g. ERSxxxxxx-ERSxxxxxx', 'regex': '(^[ESD]R[SR]\\d{6,}(,[ESD]R[SR]\\d{6,})*$)|(^SAM[END][AG]?\\d+(,SAM[END][AG]?\\d+)*$)|(^EGA[NR]\\d{11}(,EGA[NR]\\d{11})*$)|(^[ESD]R[SR]\\d{6,}-[ESD]R[SR]\\d{6,}$)|(^SAM[END][AG]?\\d+-SAM[END][AG]?\\d+$)|(^EGA[NR]\\d{11}-EGA[NR]\\d{11}$)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'sample same as', 'description': 'Reference to sample(s) that are equivalent. The referenced sample(s) should already be registered in INSDC. This should be formatted as one of the following. A single sample e.g. ERSxxxxxx OR a comma separated list e.g. ERSxxxxxx,ERSxxxxxx', 'regex': '(^[ESD]RS\\d{6,}(,[ESD]RS\\d{6,})*$)|(^SAM[END][AG]?\\d+(,SAM[END][AG]?\\d+)*$)|(^EGAN\\d{11}(,EGAN\\d{11})*$)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'sample symbiont of', 'description': 'Reference to host sample from symbiont. The referenced sample should already be registered in INSDC. E.g. ERSxxxxxx', 'regex': '(^[ESD]RS\\d{6,}$)|(^SAM[END][AG]?\\d+$)|(^EGAN\\d{11}$)', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'sample coordinator', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'},
            {'label': 'sample coordinator affiliation', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ], 
        'name': 'sample collection'}, 

        {'fields': [
            {'label': 'sex', 'description': 'sex of the organism from which the sample was obtained', 'type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'relationship', 'description': 'indicates if the specimen has a known parental, child, or sibling relationship to any other specimens.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'symbiont', 'description': "Used to separate host and symbiont metadata within a symbiont system where the host species are indicated as 'N' and symbionts are indicated as 'Y'", 'options': ['N', 'Y'], 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ], 
        'name': 'Organism characteristics', 
        'description': 'Characteristics of the source organism'},

        {'fields': [
            {'label': 'collecting institution', 'description': 'Name of the institution to which the person collecting the specimen belongs. Format: Institute Name, Institute Address', 'type': 'text_area_field', 'mandatory': 'mandatory', 'multiplicity': 'single'}, 
            {'label': 'GAL', 'description': 'the name (or acronym) of the genome acquisition lab responsible for the sample.', 'options': ['Centro Nacional de Análisis Genómico', 'DNA Sequencing and Genomics Laboratory, Helsinki Genomics Core Facility', 'Dalhousie University', 'Dresden-concept', 'Earlham Institute', 'Functional Genomics Center Zurich', 'GIGA-Genomics Core Facility, University of Liege', 'Genoscope', 'Geomar Helmholtz Centre', 'Lausanne Genomic Technologies Facility', 'Marine Biological Association', 'NGS Bern', 'NGS Competence Center Tübingen', 'Natural History Museum', 'Neuromics Support Facility, UAntwerp, VIB', 'Norwegian Sequencing Centre', 'Nova Southeastern University', 'Portland State University', 'Queen Mary University of London', 'Royal Botanic Garden Edinburgh', 'Royal Botanic Gardens Kew', 'Sanger Institute', 'SciLifeLab', 'Senckenberg Research Institute', 'The Sainsbury Laboratory', 'University of Bari', 'University of British Columbia', 'University of California', 'University of Cambridge', 'University of Derby', 'University of Edinburgh', 'University of Florence', 'University of Oregon', 'University of Oxford', 'University of Rhode Island', 'University of Vienna (Cephalopod)', 'University of Vienna (Mollusc)', 'West German Genome Centre'], 'type': 'text_choice_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ], 
        'name': 'General collection event information', 
        'description': 'General information on the collection event.'}, 
        
        {'fields': [
            {'label': 'specimen_voucher', 'description': 'Unique identifier that references the physical specimen that remains after the sequence has been obtained and that ideally exists in a curated collection.', 'type': 'text_field', 'mandatory': 'recommended', 'multiplicity': 'single'}, 
            {'label': 'specimen_id', 'description': 'Unique identifier used to link all data for the recorded specimen.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}, 
            {'label': 'GAL_sample_id', 'description': 'unique name assigned to the sample by the genome acquisition lab.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}], 
        'name': 'Pointer to physical material', 'description': 'References to sample or sample source material in physical resources'}, 
        
        {'fields': [
            {'label': 'culture_or_strain_id', 'description': 'living, culturable, named laboratory strain that sequenced material is derived from.', 'type': 'text_field', 'mandatory': 'optional', 'multiplicity': 'single'}
        ], 
        'name': 'Infraspecies information', 'description': 'Formal and informal infraspecies taxonomic information'},
        
        {'fields': [
                {'label': 'taxon ID', 'description':'The Taxon ID of the NCBI Taxonomy database, visit https://ena-docs.readthedocs.io/en/latest/faq/taxonomy_requests.html','type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'},
                {'label': 'sample unique name', 'description':'the sample unique name will be the ID of the submission to the ENA','type': 'text_field', 'mandatory': 'mandatory', 'multiplicity': 'single'},
            ],
            'name': 'Submission Informations',
        },
    ],
    mappedFields: {
        "organism part":"organism_part",
        "lifestage": "lifestage",
        "project name": "project_name",
        "tolid":"tolid",
        "barcoding center": "barcoding_center",
        "collected_by":"collected_by",
        "collection date": "collection_date",
        "geographic location (country and/or sea)": "geographic_location_country",
        "geographic location (latitude)": "geographic_location_latitude",
        "geographic location (longitude)": "geographic_location_longitude",
        "geographic location (region and locality)": "geographic_location_region_and_locality",
        "identified_by":"identified_by",
        "geographic location (depth)":"geographic_location_depth",
        "geographic location (elevation)":"geographic_location_elevation",
        "habitat":"habitat",
        "identifier_affiliation":"identifier_affiliation",
        "original collection date":"original_collection_date",
        "original geographic location" : "original_geographic_location",
        "sample derived from":"sample_derived_from",
        "sample same as":"sample_same_as",
        "sample symbiont of":"sample_symbiont_of",
        "sample coordinator": "sample_coordinator",
        "sample coordinator affiliation": "sample_coordinator_affiliation",
        "sex":"sex",
        "relationship":"relationship",
        "symbiont":"symbiont",
        "collecting institution":"collecting_institution",
        "GAL":"GAL",
        "specimen_voucher":"specimen_voucher",
        "specimen_id":"specimen_id",
        "GAL_sample_id":"GAL_sample_id",
        "culture_or_strain_id":"culture_or_strain_id",
        "sample unique name":"alias",
        "taxid":"taxId",
        "scientificName":"scientificName"
        }


}
