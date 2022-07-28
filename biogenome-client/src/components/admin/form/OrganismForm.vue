<template>
<div class="layout">
    <div class="row">
        <div class="flex">
            <h1 class="display-3">Organism Form</h1>
        </div>
    </div>
    <va-divider/>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-alert class="custom-card" closeable v-model="showAlert" :title="alert.title" border="left" :border-color="alert.color">
                {{alert.message}}
            </va-alert>
        </div>
    </div>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-card v-if="!organismToUpdate" class="custom-card">
                <va-card-title>
                    NCBI TAXONOMIC IDENTIFIER (*mandatory)
                </va-card-title>
                <va-card-content>
                    <ClientInput 
                        :label="'NCBI Taxid'"
                        :placeholder="'ex: 9606'"
                        :insdc-request="EnaService.getTaxon"
                        :portal-request="DataPortalService.getOrganism"
                        :valid-data="validTaxid"
                        @on-response="getTaxon"
                        @on-reset="resetTaxon"
                    />
                </va-card-content>
            </va-card>
            <div v-if="validTaxid">
                <div class="row">
                    <div class="flex">
                        <h1 class="display-3">{{organismFormData.scientific_name}}</h1>
                    </div>
                </div>
                <va-divider/>
                <va-card class="custom-card">
                    <va-card-title>
                        Avatar image
                    </va-card-title>
                    <va-card-content>
                        <va-input label="Avatar" v-model="organismFormData.image">
                            <template #append>
                                <va-chip @click="previewAvatar=true">Preview</va-chip>
                                <va-chip @click="organismFormData.image=null">Clear</va-chip>
                            </template>
                        </va-input>
                        <va-avatar size="large" v-show="previewAvatar" :src="organismFormData.image">
                        </va-avatar>
                    </va-card-content>
                </va-card>
                <va-card class="custom-card">
                    <va-card-title>
                        gallery images
                    </va-card-title>
                    <va-card-content>
                        <va-input
                            v-for="(opt,index) in galleryImagesOptions"
                            :key="index"
                            :label="opt.label+' ('+index+')' "
                            v-model="opt.value"
                        >
                            <template #append>
                                <va-chip outline @click="organismFormData.image_urls.push(opt.value)">Confirm</va-chip>
                                <va-chip outline @click="removeImage(index)">Remove</va-chip>
                            </template>
                        </va-input>
                    <va-button @click="galleryImagesOptions.push({label:'Image url', value:''})">Add new image</va-button>   
                    </va-card-content>
                    <va-divider/>
                    <va-card-title>
                        Gallery Preview
                    </va-card-title>
                    <va-card-content>
                        <va-carousel :items="organismFormData.image_urls" v-model="imageIndex"/>
                    </va-card-content>
                </va-card>
                <MetadataForm :metadata="organismFormData.metadata"/>
                <ListInputComponent 
                    :title="'Vernacular Names'"
                    :keyLabel="'value'"
                    :listObject="initVernacularName"
                    :modelList="organismFormData.common_names"
                    :formOptions="vernacularNameFormOptions"
                />
                <FormComponent
                    v-if="PROJECT_ACCESSION"
                    :title="'goat status'"
                    :listObject="organismFormData"
                    :formOptions="goatInformations"
                />
                <ListInputComponent
                    :title="'Related Publications'"
                    :keyLabel="'id'"
                    :listObject="initPublication"
                    :modelList="organismFormData.publications"
                    :formOptions="pubIdFormOptions"
                />
            </div>
        </div>
    </div>
    <div class="row">
        <div class="flex">
            <va-button :disabled="!validTaxid" @click="organismToUpdate ? updateOrganism() : createOrganism()">Submit</va-button>
        </div>
    </div>
</div>
     

</template>
<script setup>
import {nextTick, onMounted, reactive,ref} from 'vue'
import EnaService from '../../../services/clients/ENAClientService'
import SubmissionService from '../../../services/SubmissionService'
import {GoaTStatus,TargetListStatus,PublicationSource} from '../../../../config'
import ListInputComponent from './ListInputComponent.vue'
import FormComponent from './FormComponent.vue'
import DataPortalService from '../../../services/DataPortalService'
import MetadataForm from './MetadataForm.vue'
import ClientInput from '../../ClientInput.vue'

const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION
const props = defineProps({
    taxid:String
})
const organismToUpdate = ref(false)

const validTaxid = ref(false)
const showAlert = ref(false)

const initOrganism = {
    scientific_name:null,
    taxid:null,
    common_names:[],
    image:null,
    image_urls:[],
    metadata:{},
    publications:[],
    goat_status:null,
    target_list_status:null,
}

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

const initGalleryImage = {
    url:''
}

const initAlert = {
  title:'',
  message:'',
  color: ''
}

const alert = reactive({...initAlert})

const goatInformations = [
    {type:'select',label:'GoaT status', key:'goat_status', options:GoaTStatus.map(s => s.label)},
    {type:'select',label:'Long List status', key:'target_list_status',options:TargetListStatus.map(s => s.label)},
]
const initGalleryImageOption={
    label:'Image url',value:''
}
const galleryImagesOptions = reactive([
    {...initGalleryImageOption},
])

const initVernacularName = {
    value:null,
    lang:null,
    locality:null
}
const vernacularNameFormOptions = [
    {type:'input',label:'Value', key:'value', mandatory:true},
    {type:'input',label:'Locality', key:'locality', mandatory:true},
    {type:'input',label:'Language', key:'lang'},
]

const initPublication = {
    source:null,
    id:null,
}

const pubIdFormOptions = [
    {type:'input',label:'id', key:'id', messages: ['DOI: enter the complete string, e.g., 10.1093/nar/gks1195',
    'PubMed ID (PMID): use simple numbers, e.g., 23193287',
    'PubMed CentralID (PMCID): include the PMC prefix, e.g., PMC3531190'],
    mandatory:true},
    {type:'select',label:'source', key:'source', options:PublicationSource.map(s => s.label)},
]


const pubId= reactive({...initPublication})

const vernacularName= reactive({...initVernacularName})

const organismFormData = reactive({...initOrganism})

onMounted(()=>{
    if(props.taxid){
        validTaxid.value=true
        DataPortalService.getOrganism(props.taxid)
        .then(resp => {
            const obj = {}
            Object.keys(resp.data).forEach(k => {
                if(Object.keys(initOrganism).includes(k)){
                    obj[k] = resp.data[k]
                }
            })
            if(obj.image_urls){
                const galleryOptions = obj.image_urls.map(image => {
                    return {label:'Image url', value:image}
                })
                Object.assign(galleryImagesOptions, galleryOptions)
            }
            nextTick(()=>{
                Object.assign(organismFormData,obj)
                organismToUpdate.value = true
            })
        })
    }
})

function getTaxon(value){
    console.log(value)
    if(value.isError){
        Object.assign(alert,value.alert)
        showAlert.value=true
        validTaxid.value=false
    }else{
        organismFormData.taxid = value.data[0].tax_id
        organismFormData.scientific_name = value.data[0].description
        validTaxid.value = true
    }
}
function resetTaxon(){
    organismFormData.taxid=null
    organismFormData.scientific_name = null
    validTaxid.value=false
}
function removeImage(index){
    if(index>0){
        galleryImagesOptions.splice(index,1)
        organismFormData.image_urls.splice(index,1)
    }else{
        organismFormData.image_urls = []
        galleryImagesOptions[0].value=''
    }
}

function createOrganism(){
    SubmissionService.createOrganism(organismFormData)
    .then(resp => {
        alert.title="Success"
        alert.message=`The organism with taxid: ${organismFormData.taxid} has been correctly saved`
        alert.color="success"
        showAlert.value=true
    })
    .catch(e => {
        alert.title="Error"
        alert.message="Something happened"
        alert.color="danger"
        showAlert.value=true
    })
}

function updateOrganism(){
    SubmissionService.updateOrganism(props.taxid,organismFormData)
    .then(resp => {
        alert.title="Success"
        alert.message=`The organism with taxid: ${organismFormData.taxid} has been correctly updated`
        alert.color="success"
        showAlert.value=true
    })
    .catch(e => {
        alert.title="Error"
        alert.message="Something happened"
        alert.color="danger"
        showAlert.value=true
    })
}


</script>