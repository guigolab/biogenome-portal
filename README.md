<h1> GENEID WEB-SERVER </h1>

<div>
  <h4>TECH STACK: </h4>
<ul>
  <li>VUEJS</li>
  <li>PYTHON/FLASK</li>
  <li>MONGODB/MONGOENGINE</li>
</ul>
  <br/>
  <h4> CONTENTS </h4>
<ul>
  <li>INTRODUCTION</li>
  <li>MODEL</li>
  <li>VIEW</li>
  <li>CONTROLLER</li>
  <li>DEPENDENCIES</li>
  <li>BUILD</li>
</ul>
</div>
<br/>
<br/>
  
  
<div>
  <h4> INTRODUCTION </H4>
</div>
<span>The scope of this project is to upgrade the geneid web application and to add new features
  
  The upgrades consist in:
  -UI upgrade with the use of <a href="https://vuejs.org/">VueJs</a> and <a href="https://bootstrap-vue.org/">Boostrap Vue</a>;
  -Storage of files(GFF, params) and taxons in <a href="https://docs.mongoengine.org/">MongoDB</a>;
  -RESTful API but "one-way" direction (can we call it that way??);
  
  The new features to add are: 
  -interactive phylogenetic tree;
  -a genome browser (GFF explorer);
  
  Potential challanges: 
    Scalability: we need a scalable system capable to manage and store thousands of nodes(taxons);
    Performance: we need to avoid highloading of the graphic feature(tree and browser); 
  
</span>

<div>
  <h4> MODEL </H4>
</div>
<span>The model contains two entities: TaxonNode and TaxonFile
  
  The TaxonNode is the bottleneck of the application as the whole architecture relies on his attribute "tax_id"
  The idea is to not create directly the TaxonNodes but to rely on a service to retrieve tax_id from name or viceversa (get lineage taxon_nodes as well) --> we create a dependency to loose another paradox??
  current attributes:
  name
  tax_id
  description 
  not implemented yet:
  list of taxon_nodes (add mongoengine link --> lazyreference field  https://docs.mongoengine.org/apireference.html#mongoengine.fields.LazyReferenceField 
  
  The TaxonFile model is the model where we store files and reference them to a taxon_node (to save 	a file in the database we must provide a taxon_node first)
  current attributes:
  name
  file
  type
  taxon_node
  
Models we may need to implement:
-model for genome browser rendering: gff parsed datas, rendered genomes

  
THOUGHTS:
we are creating several relations (taxon_nodes with a list of taxon_nodes as childrens and taxon files to taxon_node):
is it right to use MongoDB? pros are faster indexation and file chunking (see gridFS) cons are that relation resolution may be trivial
</span>

</br>
 <div>
  <h4> CONTROLLER </H4>
</div>


The controller (python_flask) manage client requests by storing and retrieving data.

data flow: 

-from a script we send a post request to the files endpoint with the tax_id in the parameters to insert a file into db

datas = {'type' : 'GFF3','name' : 'sarcophilus_harrisii.no_extra_evidence.gff3'}
#my file to be sent
file = "sarcophilus_harrisii.no_extra_evidence.gff3"
path=os.path.basename(file)
tax_id = "9305"
host = "http://localhost:8000"
url = f'{host}/files/{tax_id}'

files = {
    'json': (None, json.dumps(datas), 'application/json'),
    'file': (path, open(file, 'rb'), 'application/octet-stream')
}
r = requests.post(url, files=files)


- the controller receive the request, search the taxon_node by tax_id and if not exist it creates it (part not implemented yet), then it stores the file into the db
 
</br>
 <div>
  <h4> VIEW </H4>
</div>

The view is in vue js

The idea is to create components that dynamically change their content in static pages (where the static resources are loaded), in this way each component has "ideally" one role improving maintenability and scalability

Currenlty there are two pages:
GenePrediction and GeneID

current UI architecture:

						App.vue ()
					     NavBarComponent
						
				GeneIdPage.vue() 	GenePredictionPage.vue()
			FormComponent   <--PageHeaderComponent*-->  TreeViewComponent, TaxonComponent
			

TaxonComponent: load all the taxon nodes present in the db, use the taxondataservice, it contains the file logic as well(load files by the filedataservice) improvement: move the file logic in a specific component

TreeViewComponent: drop down list tree component, the current content is hardcoded; improvements: use a service to generate the content --> async requests to controller (fetch datas on click)

PageHeaderComponent is used in both pages, its role is to load static content

FormComponent: form group, to implement: create a client service that send the form to the controller that uses another service (server side) to interface with the geneidsoftware


<div>
  <h4> DEPENDENCIES </H4>
</div>
to add a dependency front-end side: add the package name and its version in package.json
to add a dependency back-end side: add the package name and its version to requirements.txt


<div>
  <h4> BUILD </H4>
</div>

to build app in local: docker-compose -f docker-compose-dev.yml up --build
