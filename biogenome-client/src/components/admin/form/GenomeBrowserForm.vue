<template>
<va-inner-loading :loading="authStore.isLoading">
    <div class="layout">
        <div class="row">
            <div class="flex">
                <h1 class="display-3">Genome Browser Form of {{accession}}</h1>
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
                <FormComponent
                    :title="accession+' Track'"
                    :list-object="jbrowseData.assembly_track"
                    :form-options="assemblyTrackOptions"
                />
                <ListInputComponent 
                    :title="'Annotation tracks'"
                    :key-label="'name'"
                    :list-object="annotation"
                    :model-list="jbrowseData.annotation_tracks"
                    :form-options="annotationOptions"
                />
            </div>
        </div>
        <div class="row justify--space-between">
            <div class="flex">
                <va-button @click="reset()" color="danger">
                    Reset
                </va-button>
            </div>
            <div class="flex">
                <va-button @click="handleSubmit()" :disabled="!validAnnotation" >
                    Submit Data
                </va-button>            
            </div>
        </div>
    </div>
</va-inner-loading>
</template>
<script setup>

import { reactive,ref,computed, onMounted } from "vue"
import FormComponent from './FormComponent.vue'
import ListInputComponent from "./ListInputComponent.vue"
import GenomeBrowserService from "../../../services/GenomeBrowserService";
import {useRouter} from "vue-router"
import { auth } from "../../../stores/auth";
const router = useRouter()
const authStore = auth()

const props = defineProps({
    accession:String,
    toUpdate:Boolean
})
const showAlert = ref(false)

const validAnnotation = computed(()=>{
    return jbrowseData.assembly_track.fasta_location && 
    jbrowseData.assembly_track.fai_location && 
    jbrowseData.assembly_track.gzi_location && 
    jbrowseData.annotation_tracks.length
})

const alert = reactive({
    title:'',
    color:'',
    message:''
})
const initJbrowseData = {
    assembly_accession: props.accession,
    assembly_track: {},
    annotation_tracks : []
}

const initAssemblyObj = {
    fasta_location:'',
    fai_location:'',
    gzi_location:'',
    chrom_alias:''
}

const assemblyObj = reactive({...initAssemblyObj})

const initAnnotation = {
    name:'',
    gff_gz_location:'',
    tab_index_location:'',
}

const annotation = reactive({...initAnnotation})

const jbrowseData = reactive({...initJbrowseData})

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'GFF3 GZIP', key:'gff_gz_location', mandatory:true},
    {type:'input',label:'GFF3 TABIX GZIP', key:'tab_index_location', mandatory:true},
]
const assemblyTrackOptions = [
    {type:'input',label:'Fasta location', key:'fasta_location', mandatory:true},
    {type:'input',label:'fai location', key:'fai_location', mandatory:true},
    {type:'input',label:'gzi Location', key:'gzi_location', mandatory:true},
    {type:'input',label:'chromosome aliases file url', key:'chrom_alias',mandatory:false},
]

onMounted(()=>{
    if(props.toUpdate){
    GenomeBrowserService.getGenomeBrowserDatum(props.accession)
    .then(resp => {
        Object.assign(jbrowseData,resp.data)
    })
    .catch(e => {
        console.log(e)
    })
    }
})

function handleSubmit(){
    if(props.toUpdate){
        updateGenomeBrowserData()
        return
    }
    submitGenomeBrowserData()
}

function submitGenomeBrowserData(){
    authStore.isLoading=true
    GenomeBrowserService.createGenomeBrowserData(jbrowseData)
    .then(resp => {
        alert.title="Success"
        alert.message=`${resp.data}`
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
        authStore.isLoading = false
        window.scrollTo({ top: 0, behavior: 'smooth' });
    })
}

function updateGenomeBrowserData(){
    GenomeBrowserService.updateGenomeBrowserData(props.accession,jbrowseData)
    .then(resp => {
        alert.title="Success"
        alert.message=`${resp.data}`
        alert.color="success"
        showAlert.value=true
        authStore.isLoading=false
        window.scrollTo({ top: 0, behavior: 'smooth' });

    })
    .catch(e => {
        alert.title="Error"
        alert.message=`${e.response && e.response.data? e.response.data:e}`
        alert.color="danger"
        showAlert.value=true
        authStore.isLoading=false
        window.scrollTo({ top: 0, behavior: 'smooth' });

    })
}

function reset(){
    router.go()
}


</script>
