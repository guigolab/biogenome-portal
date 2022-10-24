<template>
<va-inner-loading :loading="authStore.isLoading">
    <div class="layout">
        <div class="row">
            <div class="flex">
                <h1 class="display-3">{{name? name: "Annotation Form of "+ accession}}</h1>
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
            v-if="!props.name"
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
                    v-for="(link,index) in annotation.links"
                    :key="index"
                    :label="`link ${index}`"
                    v-model="annotation.links[index]"
                >
                    <template #append>
                        <va-chip outline @click="removeLink(index)">Remove</va-chip>
                    </template>
                </va-input>
            <va-button @click="annotation.links.push('')">Add New Link Field</va-button>   
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
                <va-button @click="name? updateAnnotation() : submitAnnotation()" :disabled="(!annotation.name) && (Object.keys(annotation.metadata).length < 1)" >
                    Submit Annotation
                </va-button>            
            </div>
        </div>
    </div>
</va-inner-loading>
</template>
<script setup>
import { onMounted, reactive,ref } from "vue"
import FormComponent from './FormComponent.vue'
import MetadataForm from "./MetadataForm.vue";
import AnnotationService from "../../../services/AnnotationService";
import {useRouter} from "vue-router"
import { auth } from "../../../stores/auth";
const router = useRouter()

const authStore = auth()

const props = defineProps({
    accession:String,
    name:String
})
const showAlert = ref(false)
const alert = reactive({
    title:'',
    color:'',
    message:''
})



const initLink={
    label:'external link',value:'', saved:false,
}
const linkOptions = reactive([
    {...initLink},
])
const initAnnotation = {
    name:'',
    assembly_accession:props.accession,
    metadata:{},
    links:[]
}

const annotation = reactive({...initAnnotation})

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
]

onMounted(()=>{
    console.log(props.name)
    if(props.name){
        AnnotationService.getAnnotation(props.name)
        .then(resp => {
            Object.keys(resp.data).forEach(k => {
                if(annotation[k]){
                    annotation[k] = resp.data[k]
                }
            })
            if(annotation.links.length){
                linkOptions.pop()
            }
            annotation.links.forEach(link => {
                linkOptions.push({label:'External link', value:link,saved:true})
            })
            // Object.assign(annotation,resp.data)
        })
        .catch(e => {
            console.log(e)
        })
    }
})

function removeLink(index){
    linkOptions.splice(index,1)
    annotation.links.splice(index,1)
}

function submitAnnotation(){
    authStore.isLoading=true
    annotation.links = annotation.links.filter(l => l)
    AnnotationService.createAnnotation(annotation)
    .then(resp => {
        alert.title="Success"
        alert.message=`${resp.data.name} correctly saved`
        alert.color="success"
        showAlert.value=true
        authStore.isLoading=false
        window.scrollTo({ top: 0, behavior: 'smooth' });
    })
    .catch(e => {
        console.log(e)
        alert.title="Error"
        alert.message=`${e.response && e.response.data? e.response.data:e}`
        alert.color="danger"
        showAlert.value=true
        authStore.isLoading=false
        window.scrollTo({ top: 0, behavior: 'smooth' });
    })
}

function updateAnnotation(){
    authStore.isLoading=true
    //remove name from annotation object
    annotation.links = annotation.links.filter(l => l)
    const annotationToUpdate = {}
    Object.keys(annotation).filter(k => k !== 'name').forEach(k => {
        annotationToUpdate[k] = annotation[k]
    })
    AnnotationService.updateAnnotation(props.name, annotationToUpdate)
    .then(resp => {
        alert.title="Success"
        alert.message=`${resp.data.name} correctly updated`
        alert.color="success"
        showAlert.value=true
        authStore.isLoading=false

    })
    .catch(e => {
        alert.title="Error"
        alert.message=`${e.response && e.response.data? e.response.data:e}`
        alert.color="danger"
        showAlert.value=true
        authStore.isLoading=false
    })
}


function reset(){
    router.go()
}
</script>