<div id="top"></div>

<!-- PROJECT LOGO -->
<br />
<div align="center">

  <h3 align="center">Biogenome data portal</h3>

  <p align="center">
    A web app for genomic biodiversity!
    <br />
    <br />
    <a href="https://github.com/emiliorighi/biogenome-portal/issues">Report Bug</a>
    <a href="https://github.com/emiliorighi/biogenome-portal/issues">Request Feature</a>
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



<!-- ABOUT THE PROJECT -->
## About The Project

This project aims to provide an easy way to show biodiversity within a geographical context (country, region, botanical garden, zoo, sequencing projects).

Species are created from samples representing the physical or genetic entity of the species.

The samples can be inserted locally via excel (following the format of the ERGA manifest) or via form.¡

This project offers additional services for sequencing projects:

* cronjob to collect public information related to the project (genomic data)
* export of an excel file containing locally inserted samples to submit to COPO(https://copo-project.org/)


IMPORTANT:
This project uses the metadata of the ERGA manifesto (https://github.com/ERGA-consortium/COPO-manifest) and is mainly intended to retrieve data from BioSamples(https://www.ebi.ac.uk/biosamples) for samples metadata and ENA (https://www.ebi.ac.uk/ena/browser/home) for reads and assemblies. For specific project needs you can open an issue.

Use the `BLANK_README.md` to get started.

<p align="right">(<a href="#top">back to top</a>)</p>



### Built With

This project is built with the following stack:

* [Vue.js](https://vuejs.org/)
* [FlaskRESTful](https://flask-restful.readthedocs.io/en/latest/)
* [MongoDB](https://www.mongodb.com/) 

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

Before building the application it is necessary to configure the .env file in the project's root directory:
The .env file contains many parts that have to be configured depending on the needs:

	The API KEY part:
	USER=admin --> Define the user name that will be inserted to access the admin area
	JWT_SECRET_KEY=secret_restKey #change this in production!! --> key to encrypt the RESTKEY (below)
	RESTKEY=secretPassword #change this in production!! --> password that will be inserted to access the admin area

	The CRONJOB part:
	PROJECTS=  --> list of projects (comma separated) wich name figures in the sample metadata submitted to the ENA/BioSamples
	EXEC_TIME=600 --> how often, in seconds, the job should be performed

	The DATA PORTAL part:
	RANKS=superkingdom,kingdom,phylum,subphylum,class,order,family,genus,species,subspecies --> ordered, descending list of taxonomic ranks you want to display. Note that is a rank is not present in the species' lineage it will be skipped, for instance you may find phylum nodes that has as a children class nodes.
	MAX_NODES=90 --> number of max leaves to display in the tree of life page



To add a custom logo and an icon follow this steps:
- save the icon in client/public directory
- save the logo in client/public/static/img directory
- go to client/public/index.html and change line 7 with the full name of your icon (<%= BASE_URL %>ICON_NAME.ico>
- go to client/src/components/base/NavBarComponent.vue and change line 4 with the full name of your image (:src="'./static/img/LOGO_IMAGE.png'" id="logo-image" alt="EBP logo")

To modify themes and layout read carefully https://bootstrap-vue.org/



To get a local copy up and running follow these simple example steps.

### Installation

You need to have docker compose installed (https://docs.docker.com/compose/)

1. Configure the .env file as above
2. Run this command in the root directory:
	sudo docker-compose -f docker-compose.yml up --build
3. To start creating data go to: /admin from the home page and login


<p align="right">(<a href="#top">back to top</a>)</p>


## External APIs
This project consumes different externals APIs to retrieve taxonomic and genomic informations about species, therefore changes in these APIs might break the species creation. Please open an issue if this is the case.

Here is a list of the APIs consumed:

[ENA Portal API](https://www.ebi.ac.uk/ena/portal/api/)
[NCBI Taxonomy API](https://api.ncbi.nlm.nih.gov/datasets/docs/v1/reference-docs/rest-api/)
[ENA BioSamples API](https://www.ebi.ac.uk/biosamples/docs/references/api)


## Sequencing Project
For sequencing projects with the aim to sequence species within a geographical context, it is strongly recommended to submit public samples to the ENA via the COPO web service, this service ensure that all the submitted samples share the same format before submission to ENA. It will, then, be responsibility of the single project to upload assemblies and reads to ENA/NCBI and associate them with the sample accession submitted through COPO. 
To facilitate the sample submission to COPO this project provides the possibility to download the samples inserted locally in an excel compliant with the ERGA manifesto. The generate excel will be then submitted to COPO. Once the samples will be pubblicly available in BioSamples the data portal will link the accession to the sample unique name and will start checking for new assemlies and/or reads every time the cronjob will be executed (changing the EXEC_TIME env variable).

The importance of the sample unique name:
This field is used to uniquely identified the sample entity, within this scope a sample can be a living entity or part of it, imagine a sample as the set of metadata(from the sample collection event, the sample preservation and the sample charateristics) related to an assembly or an experiment.


IMPORTANT:
If for any reason you have to manage sample submission on your own, you could still use this data portal as a backup/status tracking service if you are compliant with this ENA-checklist (remember that the samples need to be public in order to be displayed in the data portal and it is recommended to submit the samples in BioSamples and then link the genomic data to its accession.

## The import of samples from BioSamples
The cronjob function allows to download all the samples (with this metadata checklist) related to one or more projects. By declaring the various project names it is possible to import samples at every layer of a biogenome project/effort. 

Note: 
The import function uses the BioSamples API to retrieve samples metadata via the project_name attribute. If your project have already submitted the samples and linked some genomic data to this samples it is still possible to insert this sample in the data portal via excel or form, by adding the correct accession field, the program will then seek for all the genomic data related to this sample

<!-- ROADMAP -->
## Roadmap

- [ ] Add Changelog
- [ ] Add JSON schema (OAS docs)
- [ ] Add custom fields management


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

Project Link: [https://github.com/emiliorighi/biogenome-portal](https://github.com/emiliorighi/biogenome-portal)

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
