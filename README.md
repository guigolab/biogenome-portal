<div id="top"></div>

<!-- PROJECT LOGO -->
<br />
<div align="center">

  <h3 align="center">Biogenome data portal</h3>

  <p align="center">
    A web interface for biodiversity!
    <br />
    <br />
    <a href="/../../issues">Report Bug</a>
    <a href="/../../issues">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li><a href="#built-with">Built With</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ol>
        <li><a href="#containers">Containers</a>
          <ol>
            <li><a href="#front-end">Front end</a></li>
            <li><a href="#back-end">Back end</a></li>
            <li><a href="#database">Database</a></li>
            <li><a href="#cronjob">cronjob</a></li>
          </ol>
        </li>
        <li><a href="#configurations">Configurations</a>
          <ol>
            <li><a href="#config-json">Front end configuration</a></li>
            <li><a href="#env-file">Env variables configuration</a></li>
          </ol>
        </li>
        <li><a href="#run-locally">Run locally</a></li>
        <li><a href="#deploy">Deploy</a></li>
      </ol>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#External APIs">External APIs</a></li>
    <li><a href="#SequencingProject">Sequencing project services</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

This project aims to provide a user-friendly interface to show and manage biodiversity metadata.

### Built With

This project is built with the following stack:

* [Vue.js](https://vuejs.org/)
* [FlaskRESTful](https://flask-restful.readthedocs.io/en/latest/)
* [MongoDB](https://www.mongodb.com/) 


### Getting Started

To launch this application locally you must have docker-compose installed!

Follow this instructions to install it: <a href="https://docs.docker.com/compose/install/">install docker-compose</a>

### Containers

This app is composed by 4 docker containers that are built and launched via a docker-compose file.

### Front End

The Front-end container compile the Vue3 app with Vite and serve it via NGINX

### Back end

The Back-end container consists in a API, implemented in flaskRESTful, and exposed via uWSGI web server that communicates with the NGINX proxy present in the front-end container. This container is the one that manages the client requests from the front-end container, query the database and return the JSON response to the front-end container

### Database

The database container is a MongoDB image

### Cronjob

The cronjob container is optional as it is necessary only to run scheduled jobs that downloads metadata already published in INSDC.

It downloads assemblies and related metadata generated under a bioproject accession at the following endpoint: https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}

It downloads biosamples via the project name attribute at the following endpoint: https://www.ebi.ac.uk/biosamples/samples?size=200&filter=attr%3Aproject%20name%3A{project_name}

It checks for new reads for each biosample already saved in the database at the following endpoint: https://www.ebi.ac.uk/ena/portal/api/filereport?result=read_run&accession={accession}


### Configurations

Before running the project it is necessary to configure an environment file to place in the root of the project, this will be used by all the containers, and a config.json file that will be used by the front-end container.

By default the portal is configured to retrieve public data under the EBP umbrella (https://www.earthbiogenome.org/) it will load (at building stage) and seed the database with the last dump (/dump-db directory)

### Front end configuration

The config.json file is used to customize the user interface, such as the layout, icons, logos, app title and description.

### Env variables configuration

The env file is necessary to run the app. Below a list of all the environment variables needed to run the app:

- DB_NAME=db  --> this is the name of the database
- DB_USER=user --> this is the name of the database admin user*
- DB_PASS=password --> this is the password of the database admin user*

*When first launched the app will create a User with the same credentials as the admin user of the database, this user will be able to log in into the admin UI and to manage all the data as creating/deleting/updating users, organisms etc.

- DB_HOST=biogenome-devdb --> this is the name of the database container (host) # default dev db host


- DB_PORT=27017
- DB_DUMP=last_mongo_dump.gz --> this is the database dump containing all the data of the database, we will keep it updated*

*IMPORTANT: the dump contains all the data submitted to INSDC under the Earth BioGenome Project umbrella

- MONGO_INITDB_ROOT_USERNAME=root
- MONGO_INITDB_ROOT_PASSWORD=root
- MONGO_INITDB_DATABASE=admin
- MONGODB_DATA_DIR=/var/lib/mongodb-data
- MONDODB_LOG_DIR=/dev/null

- FLASK_ENV=development --> should be null in production
- APP_NAME=BioGenomePortal
- API_PORT=80
- API_HOST=biogenome_server
- PROXY_HOST=biogenome_nginx
- PROCESSES=4
- THREADS=2
- JWT_SECRET_KEY=secret_restKey --> key used to encrypt the JWT token of the admin area

- PROJECT_ACCESSION=PRJNA533106 --> the INSDC bioproject accession of the root bioproject
- PROJECTS= --> the list of project which name is present in the project name field of the published biosample metadata, it must be composed by {PROJECT_NAME}_{BIOPROJECT_ACCESSION}: ex: ERGA_PRJEB43510

- ROOT_NODE=2759 --> the NCBI taxonomic identifier of the root node

- CESIUM_TOKEN=***** --> the token needed to use the Cesium 3D world map, to generate a token go to: https://cesium.com/ion/tokens


### Installation

Once configured the .env file run this command in the root directory:
	
  sudo docker-compose -f docker-compose.dev.yml up --build

This will load the last generated db dump containing all the public data under the EBP scope (https://www.earthbiogenome.org/)


### External APIs
This project consumes different externals APIs to retrieve taxonomic and genomic informations about species, therefore changes in these APIs might break the species creation. Please open an issue if this is the case.

Here is a list of the APIs consumed:

[ENA Portal API](https://www.ebi.ac.uk/ena/portal/api/)
[NCBI Taxonomy API](https://api.ncbi.nlm.nih.gov/datasets/docs/v1/reference-docs/rest-api/)
[EBI BioSamples API](https://www.ebi.ac.uk/biosamples/docs/references/api)

### Admin area

The admin area allows to manage all the data present in the database.

Reads, Biosamples and Assemblies published in INSDC can be manually imported via form by their respective accession number. These data cannot be further modified but can be deleted.

Organisms(taxons) can be imported by their NCBI taxonomic identifier, or will be automatically imported when other related metadata (Samples, reads or assemblies) are created. Data such as urls of images, vernacular names, key-value metadata and related publications can be added via form.

Samples metadata can be imported locally via a spreadsheet file (.xlsx), through a form it will be necessary to declare the column names for the taxon identifier, the scientific name and the unique identifier of the sample. This feature can be useful to manage sample metadata before submission to INSDC. Column names containing "ORCID" will not be imported

Annotations can be added from an imported assembly (link to download the annotation + metadata)

### Genome Browser

The app provides a genome browser (JBrowse2: https://jbrowse.org/jb2/ ) to visualize genomic annotations related to an imported assembly.

The genome browser data requires the links to the following files:

  Genome:
    genome.fa.gz
    genome.fa.gz.fai
    genome.fa.gz.gzi
    chromosome_aliases.txt -_> this field is mandatory if the gff file uses a different chromosome nomenclature


To generate the files above follow this steps:

    bgzip -i genome.fa

    samtools faidx genome.fa.gz

  Annotation (the gff must be sorted):
    genes.gff.gz
    genes.gff.gz.tbi

To generate the files above follow this steps:

    gt gff3 -sortlines -tidy -retainids genes.gff3 > genes.sorted.gff3

    bgzip genes.gff

    tabix genes.gff.gz

Example of 

For more informations visit: https://jbrowse.org/jb2/docs/



IMPORTANT:
 It is possible to add just one fasta per assembly, while it is possible to add as many gene annotations as desired.

 The app does not provide a way to directly store the file, but files can be stored in any cloud provider (which supports range requests and return the correct http code (206)) or can be served by the front-end container (NGINX) see example in the code in the /genome-browser-data path.


<!-- ROADMAP -->
## Roadmap

- [ ] Add Changelog
- [ ] Add API Documentation
- [ ] Add tests (I know..)


<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Emilio Righi - emilio.righi@crg.eu

Project Link: https://github.com/guigolab/biogenome-portal

