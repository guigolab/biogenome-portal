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
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
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

HERE is the live demo: https://genome.crg.cat/portal-dev/#/

<!-- ABOUT THE PROJECT -->
## About The Project

This project aims to provide an easy way to show biodiversity within a geographical context (country, region, botanical garden, zoo, sequencing projects).

Species are created from samples representing the physical or genetic entity of the species.

The samples can be inserted locally via excel (following the format of the ERGA manifest) or via form.

This project offers additional services for sequencing projects (under the Earth Biogenome scope):

* cronjob to collect INSDC data related to the project (genomic data): assemblies, reads, samples metadata and taxonomy.
* export of an excel file containing locally inserted samples to submit to COPO(https://copo-project.org/)


IMPORTANT:
This project uses the metadata of the ERGA manifest (https://github.com/ERGA-consortium/COPO-manifest) and is mainly intended to retrieve data from BioSamples(https://www.ebi.ac.uk/biosamples) for samples metadata and ENA (https://www.ebi.ac.uk/ena/browser/home) for reads and assemblies. For specific project needs you can open an issue.


<p align="right">(<a href="#top">back to top</a>)</p>



### Built With

This project is built with the following stack:

* [Vue.js](https://vuejs.org/)
* [FlaskRESTful](https://flask-restful.readthedocs.io/en/latest/)
* [MongoDB](https://www.mongodb.com/) 

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

By default the portal is configured to retrieve public data under the EBP umbrella (https://www.earthbiogenome.org/) it will load (at building stage) and seed the database with the last dump (/dump-db directory)

If you want to customize the portal follow the steps below:

  General configurations:
  - Set the ROOT_NODE env variable with the Taxon name you want to use as a root (default: Eukaryota)
  
  Public data management:
  - in the .env file insert the PROJECT_ACCESSION (The INSDC BioProject accession) of the project you want to use as a root:
      if the bioproject you want to use as a root is not under the EBP umbrella, you have to comment the volumes of the biogenome_mongo service in the docker-compose-dev file:
                  - ./mongo-init.sh:/docker-entrypoint-initdb.d/mongo-init.sh
                  - ./mongo-restore.sh:/docker-entrypoint-initdb.d/mongo-restore.sh
                  - ./db-dump:/db-dump
  - if the same project or sub projects are defined as attributes of the sample metadata (ex: project name: 'YOUR_PROJECT_NAME') submitted in INSDC, set the list of comma separated project names in the PROJECTS env variable (default values: VGP(https://vertebrategenomesproject.org/), DTOL(https://www.darwintreeoflife.org/)) 

  -EXEC_TIME: how often, in seconds, the job should be performed it does nothing if PROJECTS OR PROJECT_ACCESSION are empty

  NOTE: if you are just interested in local data management remove the default values of PROJECTS and PROJECT_ACCESSION

  Local data management:

  Configure this part if you want to enter samples locally
	USR=admin --> Define the user name that will be inserted to access the admin area
	JWT_SECRET_KEY=secret_restKey #change this in production!! --> key to encrypt the RESTKEY (below)
	RESTKEY=secretPassword #change this in production!! --> password that will be inserted to access the admin area


To add a custom logo and an icon follow this steps:
- save the icon in client/public directory
- save the logo in client/public/static/img directory
- go to client/public/index.html and change line 7 with the full name of your icon (<%= BASE_URL %>ICON_NAME.ico>
- go to client/src/components/base/NavBarComponent.vue and change line 4 with the full name of your image (:src="'./static/img/LOGO_IMAGE.png'" id="logo-image" alt="EBP logo")

To modify themes and layout read carefully https://bootstrap-vue.org/

To add a custom links to the navigation menu follow this steps:
-go to client/src/components/base/NavBarComponent.vue
-add the code snippet below after line 17   
        <b-nav-item  active-class="active" class="nav-link" href="PUT YOUR LINK HERE">
            PUT THE NAME YOU WANT HERE 
        </b-nav-item>
You can add as many navigation items as you need


To get a local copy up and running follow these simple example steps.

### Installation

You need to have docker compose installed (https://docs.docker.com/compose/). 

1. Run this command in the root directory:
	sudo docker-compose -f docker-compose.dev.yml up --build

  This will load the last generated db dump containing all the public data under the EBP scope (https://www.earthbiogenome.org/)

2. To start creating data go to: /admin from the home page and login


<p align="right">(<a href="#top">back to top</a>)</p>


## External APIs
This project consumes different externals APIs to retrieve taxonomic and genomic informations about species, therefore changes in these APIs might break the species creation. Please open an issue if this is the case.

Here is a list of the APIs consumed:

[ENA Portal API](https://www.ebi.ac.uk/ena/portal/api/)
[NCBI Taxonomy API](https://api.ncbi.nlm.nih.gov/datasets/docs/v1/reference-docs/rest-api/)
[ENA BioSamples API](https://www.ebi.ac.uk/biosamples/docs/references/api)


## Sequencing Project
For sequencing projects, it is strongly recommended to submit public samples to the ENA via the [COPO web service](https://copo-project.org/), this service ensure that all the submitted samples share the same format before submission to ENA(INSDC). It will, then, be responsibility of the single project to upload assemblies and reads to ENA/NCBI and associate them with the sample accession submitted through COPO. 
To facilitate the sample submission to COPO this project provides the possibility to download the samples inserted locally in an excel compliant with the [ERGA submission manifest](https://github.com/ERGA-consortium/COPO-manifest). The generated excel will be then submitted to COPO. Once the samples will be pubblicly available in BioSamples the data portal will link the accession to the sample unique name and will start checking for new assemlies and/or reads every time the cronjob will be executed (the EXEC_TIME env variable).
IMPORTANT: the ERGA manifest will change during time, this portal will try to keep it up to date.

The importance of the TUBE_OR_WELL_ID field:
This field is used to uniquely identify the sample entity, within this scope a sample can be a whole organism or part of it, imagine a sample as the set of metadata (from the sample collection event, the sample preservation and the sample charateristics) related to an assembly or an experiment. It will be used to retrieve the sample accession from the COPO's API (feature not implemented yet: waiting for COPO to implement the API for ERGA).


IMPORTANT:
If for any reason you have to manage sample submission on your own, you could still use this data portal as a backup/status tracking service if you are compliant with this [ENA-checklist](https://www.ebi.ac.uk/ena/browser/view/ERC000053) (remember that the samples need to be public in order to be displayed in the data portal, it is recommended to submit the samples first in BioSamples and then link the genomic data to their respective accession.

## The import of samples from BioSamples
The cronjob function allows to download all the samples (with this metadata checklist) related to one or more projects. By declaring the various project names it is possible to import samples at every layer of a biogenome project/effort.

## The import of BioProject data from NCBI
The cronjob function allows to download all the data published under a bioproject, it will automatically create the sample's metadata from NCBI or from EBI/BioSamples, then the cronjob will retrieve public reads linked to the sample accession in ENA.

Note: 
The import function uses the BioSamples API to retrieve samples metadata via the project_name attribute. If your project have already submitted the samples and linked some genomic data to this samples it is still possible to insert this sample in the data portal via excel or form, by adding the correct accession field, the program will then seek for all the genomic data related to this sample

<!-- ROADMAP -->
## Roadmap

- [ ] Add Changelog
- [ ] Add API Documentation
- [ ] Add tests (I know..)





See the [open issues](https://github.com/othneildrew/Best-README-Template/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#top">back to top</a>)</p>



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

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Emilio Righi - emilio.righi@crg.eu

Project Link: https://github.com/guigolab/biogenome-portal

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

List of projects and code snippets that inspired the creation of this project:

* [Tree of life d3js](https://observablehq.com/@d3/tree-of-life)
* [Darwin Tree of Life](https://github.com/TreeOfLifeDCC)
* [OpenLayers](https://openlayers.org/)
* [COPO](https://github.com/collaborative-open-plant-omics)
* [GOAT](https://github.com/genomehubs)



<p align="right">(<a href="#top">back to top</a>)</p>
