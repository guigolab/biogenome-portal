<template>
    <va-card>
        <va-card-title>
            Organism Form
        </va-card-title>
        <va-divider/>
        <va-card-content>
            <va-alert :color="alert.color?alert.color:'info'" :title="alert.title">
                {{alert.message}}
            </va-alert>
            <div class="row">
                <div class="flex">
                    <va-card>
                        <va-card-title>
                            TAXONOMIC INFORMATIONS
                        </va-card-title>
                        <va-card-content>
                            <va-inner-loading :loading="taxidLoading">
                                <va-input v-model="organismFormData.taxid" :disabled="organismFormData.scientific_name">
                                    <template #prepend>
                                        <va-chip v-if="organismLoaded" disabled flat>
                                            {{organismFormData.scientific_name}}
                                        </va-chip>
                                    </template>
                                    <template #append>
                                        <va-chip :disabled="!organismFormData.taxid" @click="getTaxon()" outline>
                                            Validate Taxon Id
                                        </va-chip>
                                        <va-chip @click="resetTaxon()" outline>
                                            Reset taxid
                                        </va-chip>
                                    </template>
                                </va-input>
                            </va-inner-loading>
                        </va-card-content>
                        <va-card-content>
                            <va-input
                                v-model="organismFormData.description"
                                type="textarea"
                                label="Description"
                                autosize
                            />
                            <va-input
                                v-model="organismFormData.interest"
                                type="textarea"
                                label="Interest"
                                autosize
                            />
                            <va-input
                                v-model="organismFormData.distribution"
                                type="textarea"
                                label="Distribution"
                                autosize
                            />
                            <va-input
                                v-model="organismFormData.funding"
                                type="textarea"
                                label="Funding"
                                autosize
                            />
                        </va-card-content>
                    </va-card>
                    <va-card>
                        <va-card-title>
                            IMAGES
                        </va-card-title>
                        <va-card-content>
                            <va-input label="Main Picture" v-model="organismFormData.image">
                                <template #append>
                                    <va-chip @click="previewAvatar=true">Preview</va-chip>
                                </template>
                            </va-input>
                            <va-avatar size="large" v-show="previewAvatar" :src="organismFormData.image">
                            </va-avatar>
                        <va-card>
                            <va-card-title>
                                Gallery images
                            </va-card-title>
                            <va-card-content>
                                <va-input v-for="(url,index) in imageUrlInputs" :key="index" v-model="url.imageUrl">
                                    <template #append>
                                        <va-icon name="remove" @click="imageUrlInputs.splice(index,1);organismFormData.image_urls.splice(index,1)"/>
                                        <va-icon name="add" @click="organismFormData.image_urls.push(url.imageUrl)"/>
                                    </template>
                                </va-input>
                                <va-button @click="imageUrlInputs.push({imageUrl:''})">Add new image</va-button>
                                <va-button @click="previewImages=true">Preview images</va-button>
                                <va-divide/>
                                <div class="row justify--center">
                                    <div class="flex lg6 md6 sm12 xs12">
                                        <va-carousel v-show="previewImages" :items="organismFormData.image_urls" v-model="imageIndex"/>
                                    </div>
                                </div>
                            <va-card-actions>
                            </va-card-actions>
                            </va-card-content>
                        </va-card>
                        </va-card-content>
                    </va-card>
                </div>
                <div class="flex">
                    <va-card>
                        <va-card-title>
                            vernacular names
                        </va-card-title>
                        <va-card-content v-if="organismFormData.common_names.length">
                            <va-button-dropdown v-for="vName in organismFormData.common_names" :key="vName.value" :label="vName.value">
                                <ul>
                                    <li>
                                        <va-chip icon="edit" @click="editVernacularName(vName.value)" flat>Edit Name</va-chip>
                                    </li>
                                    <li>
                                        <va-chip icon="delete" @click="removeVernacularName(vName.value)" flat>Remove Name</va-chip>
                                    </li>
                                </ul>
                            </va-button-dropdown>
                            <va-chip >{{vName.value}}</va-chip>
                        </va-card-content>
                        <va-card-content>
                            <va-input
                                v-model="vernacularName.value"
                                label="Value (*Mandatory)"
                                autosize
                            />
                            <va-input
                                v-model="vernacularName.lang"
                                label="Language"
                                autosize
                            />
                            <va-input
                                v-model="vernacularName.locality"
                                label="Locality (*Mandatory)"
                                autosize
                            />
                        </va-card-content>
                        <va-card-actions>
                            <va-button @click="addVernacularName()">Add name</va-button>
                        </va-card-actions>
                    </va-card>
                    <va-card v-if="PROJECT_ACCESSION">
                        <va-card-title>
                            GoaT
                        </va-card-title>
                        <va-card-content>
                            <va-select
                                label="goat status"
                                :options="GoaTStatus.map(s => s.label)"

                                v-model="organismFormData.goat_status"
                            />
                            <va-select
                                label="long list status"
                                :options="TargetListStatus.map(s => s.label)"
                                v-model="organismFormData.long_list_status"
                            />
                            <va-card>
                                <va-card-title>Publication Id</va-card-title>
                                    <va-card-content v-if="organismFormData.publications.length">
                                        <va-button-dropdown v-for="(pub,index) in organismFormData.publications" :key="index" :label="pub">
                                            <ul>
                                                <li>
                                                    <va-chip icon="edit" @click="editPub(vName.value)" flat>Edit Publication </va-chip>
                                                </li>
                                                <li>
                                                    <va-chip icon="delete" @click="organismFormData.publications.splice(index,1)" flat>Remove Publication</va-chip>
                                                </li>
                                            </ul>
                                        </va-button-dropdown>
                                        <va-chip >{{vName.value}}</va-chip>
                                    </va-card-content>
                            </va-card>
                            <va-input  
                                label="Publication Id" 
                                :messages="['DOI: enter the complete string, e.g., 10.1093/nar/gks1195',
                                'PubMed ID (PMID): use simple numbers, e.g., 23193287',
                                'PubMed CentralID (PMCID): include the PMC prefix, e.g., PMC3531190']"
                                v-model="pubId.url"
                            >
                                <template #prepend>
                                    <va-select
                                        :options="PublicationSource.map(p => p.label)"
                                        v-model="pubId.source"
                                    />
                                </template>
                                <template #append>
                                    <va-button @click="organismFormData.publications.push(pubId)" icon="add">Add publication</va-button>
                                </template>
                            </va-input>
                        </va-card-content>
                    </va-card>
                </div>
            </div>        
        </va-card-content>
        <va-card-actions>
            <va-button @click="createSample()">Create Sample</va-button>
        </va-card-actions>
    </va-card>
</template>
<script setup>
import {nextTick, reactive,ref} from 'vue'
import EnaService from '../../../services/ENAClientService'
import SubmissionService from '../../../services/SubmissionService'
import {PROJECT_ACCESSION,GoaTStatus,TargetListStatus,PublicationSource} from '../../../../config'


const taxidLoading = ref(false)
const previewAvatar = ref(false)
const organismLoaded = ref(false)

const previewImages = ref(false)

const imageUrlInputs = ref([
    {imageUrl:''}
])

const pubIdInputs = ref([
    {source:'',url:''}
])

const imageIndex = ref(0)

const initAlert = {
  title:'',
  message:'',
  color: ''
}

const alert = reactive({...initAlert})

const taxonomicForm = [
  {label:'Local id',message:'column name of the unique identifier of the excel',key:'id'},
  {label:'NCBI Taxonomic Identifier',message:'column name of the taxonomic identifier',key:'taxid'},
  {label:'Scientific Name',message:'column name of the scientific name',key:'scientific_name'},
  {label:'Broker source',message:'lower case name of the broker service. Ex: copo; leave this field empty if data is only local',key:'source'}
]

const initVernacularName = {
    value:null,
    lang:null,
    locality:null
}

const initPublication = {
    source:null,
    url:null,
}
const pubId= reactive({...initPublication})

const vernacularName= reactive({...initVernacularName})

const organismFormData = reactive({
    scientific_name:null,
    taxid:null,
    common_names:[],
    image:null,
    image_urls:[],
    description:null,
    interest:null,
    distribution:null,
    funding:null,
    links:[],
    publications:[],
    goat_status:null,
    target_list_satus:null,
})

function getTaxon(){
    taxidLoading.value = true
    EnaService.getTaxon(organismFormData.taxid)
    .then(resp => {
        nextTick(()=>{
            console.log(resp.data)
            if (resp.data && resp.data.length){
                organismFormData.taxid = resp.data[0].tax_id
                organismFormData.scientific_name = resp.data[0].description
                organismLoaded.value = true
                taxidLoading.value = false
                return
            }
            taxidLoading.value = false
            return
        })

    })
    .catch(e => {
        console.log(e)
        taxidLoading.value = false
    })
}
function addVernacularName(){
    Object.assign(alert,initAlert)
    if(vernacularName.value && vernacularName.locality){
        if( organismFormData.common_names.map(n => n.value).includes(vernacularName.value)){
            alert.title = 'Vernacular name'
            alert.message = 'name value already present'
            return
        }
        organismFormData.common_names.push({...vernacularName})
        Object.assign(vernacularName,)
        return
    }
    alert.title = vernacularName.value ? 'locality' : 'value'
    alert.message = `${alert.title} is mandatory`
    return
}

function removeVernacularName(value){
    organismFormData.common_names = [...organismFormData.common_names.filter(n => n.value !== value)]
}
function editVernacularName(value){
    organismFormData.common_names.filter(n => n.value === value)
    .forEach(n => Object.assign(vernacularName,n))
}

function removeImage(url){
    const index = organismFormData.common_names.indexOf(url)
    organismFormData.common_names = [...organismFormData.common_names.slice(0,index+1)]
}

function createSample(){
    SubmissionService.createOrganism(organismFormData)
    .then(resp => {
        console.log(resp)
    })
}

function resetTaxon(){
    organismFormData.taxid=null
    organismFormData.scientific_name = null
    organismLoaded = false
}
</script>