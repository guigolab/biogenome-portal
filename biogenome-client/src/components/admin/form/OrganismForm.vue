<template>
    <va-card>
        <va-card-title>
            Organism Form
        </va-card-title>
        <va-divider/>
        {{organismFormData}}
        <va-card-content>
            <div class="row justify-space-between">
                <div v-if="!organismToUpdate" class="flex">
                    <va-card class="custom-card">
                        <va-card-title>
                            TAXONOMIC IDENTIFIER
                        </va-card-title>
                        <va-card-content>
                            <va-inner-loading :loading="taxidLoading">
                                <div class="row justify--space-between">
                                    <div class="flex ">
                                        <va-input label="NCBI taxonomic identifier (*mandatory)" v-model="organismFormData.taxid" :disabled="organismFormData.scientific_name">
                                            <template #prepend>
                                                <va-chip v-if="organismLoaded" disabled flat>
                                                    {{organismFormData.scientific_name}}
                                                </va-chip>
                                            </template>
                                        </va-input>
                                    </div>
                                    <div class="flex">
                                        <va-chip @click="getTaxon()" outline>
                                            Validate Taxon Id
                                        </va-chip>
                                        <va-chip @click="resetTaxon()" outline>
                                            Reset taxid
                                        </va-chip>
                                    </div>
                                </div>
                            </va-inner-loading>
                        </va-card-content>
                    </va-card>
                </div>
                <div class="flex lg6 md6 sm12 xs12">
                    <FormComponent
                        :title="'Taxonomic informations'"
                        :listObject="organismFormData"
                        :formOptions="taxonomicInformations"
                    />
                </div>
                <div class="flex">
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
                </div>
                <div class="flex lg6 md6 sm12 xs12">
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
                </div>
                <div class="flex lg6 md6 sm12 xs12">
                    <ListInputComponent 
                        :title="'Vernacular Names'"
                        :keyLabel="'value'"
                        :listObject="initVernacularName"
                        :modelList="organismFormData.common_names"
                        :formOptions="vernacularNameFormOptions"
                    />
                </div>
                <div class="flex lg6 md6 sm12 xs12">
                    <FormComponent
                        v-if="PROJECT_ACCESSION"
                        :title="'goat status'"
                        :listObject="organismFormData"
                        :formOptions="goatInformations"
                    />
                </div>

                <div class="flex lg6 md6 sm12 xs12">
                    <ListInputComponent
                        :title="'Related Publications'"
                        :keyLabel="'id'"
                        :listObject="initPublication"
                        :modelList="organismFormData.publications"
                        :formOptions="pubIdFormOptions"
                    />
                </div>
            </div>        
        </va-card-content>
        <va-card-actions>
            <va-button @click="organismToUpdate?updateOrganism():createOrganism()">Submit</va-button>
        </va-card-actions>
    </va-card>
</template>
<script setup>
import {nextTick, onMounted, reactive,ref} from 'vue'
import EnaService from '../../../services/ENAClientService'
import SubmissionService from '../../../services/SubmissionService'
import {PROJECT_ACCESSION,GoaTStatus,TargetListStatus,PublicationSource} from '../../../../config'
import ListInputComponent from './ListInputComponent.vue'
import FormComponent from './FormComponent.vue'
import DataPortalService from '../../../services/DataPortalService'

const props = defineProps({
    taxid:String
})
const organismToUpdate = ref(false)
const initOrganism = {
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

const taxonomicInformations = [
    {type:'textarea',label:'Description', key:'description'},
    {type:'textarea',label:'Interest', key:'interest'},
    {type:'textarea',label:'Funding', key:'funding'},
    {type:'textarea',label:'Distribution', key:'distribution'},
]
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

function getTaxon(){
    taxidLoading.value = true
    EnaService.getTaxon(organismFormData.taxid)
    .then(resp => {
        nextTick(()=>{
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
        console.log(resp)
    })
}

function updateOrganism(){
    SubmissionService.updateOrganism(props.taxid,organismFormData)
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