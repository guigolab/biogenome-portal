<template>
<va-inner-loading :loading="isLoading">
    <va-card>
        <Transition>
        <va-card-content v-if="showAlert">
            <va-alert :title="alert.title" border="left" :border-color="alert.color">
                {{alert.message}}
            </va-alert>
        </va-card-content>
        </Transition>
        <va-card-title>
            Import assembly from INSDC
        </va-card-title>
        <va-card-content>
            <ClientInput 
                :label="'Search Assembly accession'"
                :placeholder="'ex: GCA_905340225.1'"
                :request="NCBIClientService.getAssembly"
                @on-response="parseResponse"
            />
        </va-card-content>
    </va-card>
    <va-divider/>
    <va-card>
        <va-card-title v-if="isValidAssembly">
            <div class="row justify--space-between">
                <div class="flex">
                    <p class="display-5">{{assemblyToSubmit.accession}}</p>
                </div>
                <div class="flex">
                    <va-button v-if="showAssemblyTrackForm" outline icon="delete" @click="removeAssemblyTrack()">
                        Remove genome browser tracks
                    </va-button>   
                    <va-button v-else outline icon="add" @click="addAssemblyTrack()">
                        Add genome browser tracks
                    </va-button>         
                </div>
            </div>
        </va-card-title>
        <va-card-content v-if="showAssemblyTrackForm">
            <TrackForm :accession="assemblyToSubmit.accession" :assembly-track="assemblyTrack" :annotations="annotationsToSubmit.annotations"/>
        </va-card-content>
        <va-card-content v-if="isValidAssembly">
            <ul>
                <li style="padding:10px" v-for="key in Object.keys(response)" :key="key">
                    <p style="text-align: start;"><strong>{{key+ ': '}}</strong>{{response[key]}}</p>
                    <va-divider/>
                </li>
            </ul>
        </va-card-content>
        <va-divider/>
        <va-card-actions v-if="isValidAssembly"> 
            <div class="row justify--space-between">
                <div class="flex">
                    <va-button @click="reset()" color="danger">
                        Cancel
                    </va-button>
                </div>
                <div class="flex">
                    <va-button :disabled="!(isValidAssembly && (showAssemblyTrackForm?validAssemblyTrack:!showAssemblyTrackForm))" @click="submitAssembly()">
                        Submit Assembly
                    </va-button>            
                </div>
            </div>
        </va-card-actions>
    </va-card>
</va-inner-loading>
</template>
<script setup>

import { computed, onMounted, reactive, ref, watch } from "vue";
import DataPortalService from "../../../services/DataPortalService";
import FormComponent from "./FormComponent.vue"
import NCBIClientService from '../../../services/clients/NCBIClientService'
import Pagination from '../../Pagination.vue'
import ClientInput from '../../ClientInput.vue'
import AssemblyService from "../../../services/AssemblyService";
import TrackForm from "./TrackForm.vue"
import AnnotationService from "../../../services/AnnotationService";

const showAssemblyTrackForm = ref(false)

const response = ref(null)

const showAlert = ref(false)

const isLoading = ref(false)

const isValidAssembly = ref(false)

const initAssemblyObj = {
    accession:''
}
const initAnnotations = {
    annotations: []
}
const assemblyToSubmit = reactive({...initAssemblyObj})

const annotationsToSubmit = reactive({...initAnnotations})

const initAssemblyTrack = {
    fasta_location : null,
    fai_location: null,
    gzi_location: null,
    chrom_alias: null
}
const assemblyTrack = reactive({...initAssemblyTrack})

const alert = reactive({
    title:'',
    color:'',
    message:''
})

const assemblyTrackOptions = [
    {type:'input',label:'Fasta location', key:'fasta_location', mandatory:true},
    {type:'input',label:'fai location', key:'fai_location', mandatory:true},
    {type:'input',label:'gzi Location', key:'gzi_location', mandatory:true},
    {type:'input',label:'chromosome aliases file url', key:'chrom_alias'},
]

const validAssemblyTrack = computed(()=>{
    return assemblyTrack.fasta_location && assemblyTrack.fai_location && assemblyTrack.gzi_location
})

function parseResponse(value){
    console.log(value)
    if(value.isError){
        alert.message = `${value.id} not found`
        alert.color = 'danger'
        showAlert.value = true
        return
    }
    //get element in array
    if(value.response.data && value.response.data.assemblies.length){
        const assemblyToParse = value.response.data.assemblies[0].assembly
        const parsedAssembly = {}
        Object.keys(assemblyToParse)
        .forEach(k => {
            if(k === 'org'){
                parsedAssembly['taxid'] = assemblyToParse[k].tax_id
                parsedAssembly['scientific_name'] = assemblyToParse[k].sci_name
            }else{
                if(typeof assemblyToParse[k] === 'string'){
                    parsedAssembly[k] = assemblyToParse[k]
                }
            }
        })
        response.value = parsedAssembly
        assemblyToSubmit.accession = value.id
        isValidAssembly.value = true
    }
}

function addAssemblyTrack(){
    assemblyToSubmit.track = assemblyTrack
    showAssemblyTrackForm.value = true
}

function removeAssemblyTrack(){
    const accession = assemblyToSubmit.accession
    Object.assign(assemblyToSubmit, initAssemblyObj)
    assemblyToSubmit.accession = accession
    showAssemblyTrackForm.value = false
}


function promiseParser(){
    console.log(validAssemblyTrack)
    if(validAssemblyTrack){
        return AssemblyService.importAssembly(assemblyToSubmit.accession, assemblyTrack)
    }
    return AssemblyService.importAssembly(assemblyToSubmit.accession)
}

function submitAssembly(){
    promiseParser()
    .then(resp => {
        console.log(resp)
        if(annotationsToSubmit.annotations.length){
            return AnnotationService.createAnnotation(annotationsToSubmit.annotations)
        }
        return 
    })
    .then(resp => {
        if(resp){
            console.log(resp)
        }
    })
    .catch(e => {
        console.log(e)
        // alert.title = 'Error'
        // alert.color = 'danger'
        // alert.message = 'Something happened check the console log'
        // showAlert.value = true
    })
}

function reset(){
    Object.assign(assemblyToSubmit,initAssemblyObj)
    Object.assign(assemblyTrack,initAssemblyTrack)
    response.value = null
    isValidAssembly.value = false
    showAssemblyTrackForm.value = false
}


</script>