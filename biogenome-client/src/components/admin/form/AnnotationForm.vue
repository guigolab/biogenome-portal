<template>
<va-inner-loading :loading="isLoading">
    <div class="layout">
        <div class="row">
            <div class="flex">
                <h1 class="display-3">Annotation Form</h1>
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
        <FormComponent
            :title="'annotation name'"
            :listObject="annotation"
            :formOptions="annotationOptions"
        />
        <MetadataForm :metadata="annotation.metadata"/>
        <va-card class="custom-card">
            <va-card-title>
                External links
            </va-card-title>
            <va-card-content>
                <va-input
                    v-for="(opt,index) in linkOptions"
                    :key="index"
                    :label="opt.label+' ('+index+')' "
                    v-model="opt.value"
                >
                    <template #append>
                        <va-chip outline @click="annotation.links.push(opt.value)">Confirm</va-chip>
                        <va-chip outline @click="removeLink(index)">Remove</va-chip>
                    </template>
                </va-input>
            <va-button @click="linkOptions.push({label:'External link', value:''})">Add new link</va-button>   
            </va-card-content>
            <va-divider/>
        </va-card>
        <div class="row justify--space-between">
            <div class="flex">
                <va-button @click="reset()" color="danger">
                    Reset Annotation
                </va-button>
            </div>
            <div class="flex">
                <va-button @click="submitAnnotation()" :disabled="!annotation.name && Object.keys(annotation.metadata).length < 1" >
                    Submit Annotation
                </va-button>            
            </div>
        </div>
    </div>
</va-inner-loading>
</template>
<script setup>
import { reactive,ref } from "vue"
import FormComponent from './FormComponent.vue'
import MetadataForm from "./MetadataForm.vue";
import AnnotationService from "../../../services/AnnotationService";

const props = defineProps({
    assemblyAccession:String
})

const isLoading = ref(false)

const initLink={
    label:'external link',value:''
}
const linkOptions = reactive([
    {...initLink},
])
const initAnnotation = {
    name:'',
    assembly_accession:props.assembly_accession,
    metadata:{},
    links:[]
}

const annotation = reactive({...initAnnotation})

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
]
const linksFormOptions = [
    {type:'input',label:'link', key:'id', messages: ['DOI: enter the complete string, e.g., 10.1093/nar/gks1195',
    'PubMed ID (PMID): use simple numbers, e.g., 23193287',
    'PubMed CentralID (PMCID): include the PMC prefix, e.g., PMC3531190'],
    mandatory:true},
    {type:'select',label:'source', key:'source', options:PublicationSource.map(s => s.label)},
]

function removeLink(index){
    if(index>0){
        linkOptions.splice(index,1)
        annotation.links.splice(index,1)
    }else{
        annotation.links = []
        linkOptions[0].value=''
    }
}

function submitAnnotation(){
    isLoading.value=true
    AnnotationService.createAnnotation(annotation)
    .then(resp => {
        console.log(resp)
        isLoading.value=false
    })
    .catch(e => {
        console.log(e)
        isLoading.value=false
    })
}

function reset(){
    Object.assign(annotation, initAnnotation)
}
</script>