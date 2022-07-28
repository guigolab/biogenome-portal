<template>
<va-inner-loading :loading="isLoading">
    <FormComponent
        :title="accession+' Track'"
        :list-object="assemblyTrack"
        :form-options="assemblyTrackOptions"
    />
    <ListInputComponent 
        :title="'Annotation tracks'"
        :key-label="'name'"
        :list-object="initAnnotation"
        :model-list="annotations"
        :form-options="annotationOptions"
    />
</va-inner-loading>
</template>
<script setup>

import { computed, reactive,ref } from "vue"
import FormComponent from './FormComponent.vue'
import AssemblyService from "../../../services/AssemblyService"
import ListInputComponent from "./ListInputComponent.vue"

const isLoading = ref(false)

const props = defineProps({
    accession:String,
    annotations: Array,
    assemblyTrack:Object,
})

const initJbrowseData = {
    fasta_location : null,
    fai_location: null,
    gzi_location: null,
    chrom_alias: null,
    annotations: []
}

const jbrowseData = reactive({...initJbrowseData})

const initAnnotation = {
    name:'',
    assembly_accession:props.accession,
    gff_gz_location:'',
    tab_index_location:'',
}

const validData = computed(()=>{
    initJbrowseData.annotations.length && initJbrowseData.fasta_location && initJbrowseData.fai_location && initJbrowseData.gzi_location
})
const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'GFF3 GZIP', key:'gff_gz_location', mandatory:true},
    {type:'input',label:'GFF3 TABIX GZIP', key:'tab_index_location', mandatory:true},
]
const assemblyTrackOptions = [
    {type:'input',label:'Fasta location', key:'fasta_location', mandatory:true},
    {type:'input',label:'fai location', key:'fai_location', mandatory:true},
    {type:'input',label:'gzi Location', key:'gzi_location', mandatory:true},
    {type:'input',label:'chromosome aliases file url', key:'chrom_alias'},
]

function submitTracks(){
    isLoading.value=true
    AssemblyService.updateAssembly(props.accession, assemblyTrack)
    .then(resp => {
        console.log(resp)
        return resp
    })
}

function resetTracks(){
    Object.assign(assemblyTrack,initAssemblyTrack)
    Object.assign(annotationsToSubmit,initAnnotation)

}


</script>
