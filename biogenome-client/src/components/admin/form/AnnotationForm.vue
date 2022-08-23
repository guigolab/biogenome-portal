<template>
<va-inner-loading :loading="isLoading">
    <div class="layout">
        <div class="row">
            <div class="flex">
                <h1 class="display-3">{{name? name: "Annotation Form of"+ accession}}</h1>
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
                <va-button @click="toUpdate? updateAnnotation() : submitAnnotation()" :disabled="!annotation.name && Object.keys(annotation.metadata).length < 1" >
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
const router = useRouter()

const props = defineProps({
    accession:String,
    toUpdate:Boolean,
    name:String
})
const showAlert = ref(false)
const alert = reactive({
    title:'',
    color:'',
    message:''
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
    assembly_accession:props.accession,
    metadata:{},
    links:[]
}

const annotation = reactive({...initAnnotation})

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
]

onMounted(()=>{
    if(props.name){
        AnnotationService.getAnnotation(props.name)
        .then(resp => {
            Object.assign(annotation,resp.data)
        })
        .catch(e => {
            console.log(e)
        })
    }
})

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
        alert.title="Success"
        alert.message=`${resp.data}`
        alert.color="success"
        showAlert.value=true
        isLoading.value=false
        window.scrollTo({ top: 0, behavior: 'smooth' });
    })
    .catch(e => {
        console.log(e)
        alert.title="Error"
        alert.message=`${e.response && e.response.data? e.response.data:e}`
        alert.color="danger"
        showAlert.value=true
        isLoading.value=false
        window.scrollTo({ top: 0, behavior: 'smooth' });

    })
}

function updateAnnotation(){
    isLoading.value=true
    AnnotationService.updateAnnotation(props.name, annotation)
    .then(resp => {
        alert.title="Success"
        alert.message=`${resp.data}`
        alert.color="success"
        showAlert.value=true
        isLoading.value=false

    })
    .catch(e => {
        alert.title="Error"
        alert.message=`${e.response && e.response.data? e.response.data:e}`
        alert.color="danger"
        showAlert.value=true
        isLoading.value=false
    })
}


function reset(){
    router.go()
}
</script>