<template>
<div class="row">
    <div class="flex">
    <va-card class="custom-card">
        <Transition>
        <va-card-content v-if="showAlert">
            <va-alert :title="alert.title" border="top" :border-color="alert.color">
                {{alert.message}}
            </va-alert>
        </va-card-content>
        </Transition>
        <va-card-title>
            Import Assembly
        </va-card-title>
        <va-card-content>
            <va-inner-loading
            :loading="isLoading"
            >
                <va-input 
                    label="INSDC accession"
                    placeholder="ex: GCA_905340225.1"
                    v-model="accession"
                    :disabled="assemblyLoaded"
                >
                    <template #append>
                        <va-chip :disabled="!accession" @click="getAssemblyFromNCBI()" outline>Get Assembly</va-chip>
                    </template>
                </va-input>
            </va-inner-loading>
        </va-card-content>
        <va-divider/>
        <Transition>
            <va-card-title v-if="isValidAssembly">
                <div class="row justify--space-between">
                    <div class="flex">
                        {{accession}}
                    </div>
                    <div class="flex">
                        <va-popover :message="'Clear Selection'">
                            <va-icon name="backspace" @click="resetSelection()" color="danger" outline/>
                        </va-popover>
                    </div>
                </div>
            </va-card-title>
        </Transition>
        <Transition>
            <va-card-content v-if="isValidAssembly">
                <ul>
                    <li v-for="key in Object.keys(response)" :key="key">
                        <div class="row justify--space-between">
                            <div class="flex">
                                <p class="title">{{key}}:</p>
                            </div>
                            <div class="flex">
                                <p class="text--secondary">{{response[key]}}</p>
                            </div>
                        </div>
                        <va-divider/>
                    </li>
                </ul>
            </va-card-content>
        </Transition>
        <Transition>
            <va-collapse
                v-if="assemblyLoaded"
                v-model="collapse"
                header="Add Assembly Track"
                icon="add"
                solid
            >
            <FormComponent
                :title="accession+' Track'"
                :listObject="assemblyTrack"
                :formOptions="assemblyTrackOptions"
            />
            </va-collapse>
        </Transition>
        <va-card-actions v-if="assemblyLoaded && isValidAssembly">
            <va-button @click="submitAssembly()" outline>Submit Assembly</va-button>
        </va-card-actions>
    </va-card>
    </div>
    <div class="flex">
    <va-card class="custom-card">
        <va-card-title>Assembly list</va-card-title>
        <va-card-content>
            <div class="row justify--space-between">
                <va-data-table
                    sticky-header
                    :style="{
                        '--va-data-table-scroll-table-height': '300px',
                        '--va-data-table-scroll-table-color': '#2c82e0',
                    }"
                    :items="assemblies.data"
                    :columns="['accession','assembly_name','scientific_name','actions']"
                    :hoverable="true"
                >
                <template #header(actions)>
                    <va-input
                        label="filter"
                        v-model="params.filter"
                        />
                </template>
                <template #cell(actions)="{ rowData }">
                    <va-button @click="editAssembly(rowData)" icon="edit"/>
                    <va-button v-if="rowData.auto_imported === false" @click="deleteAssembly(rowData)" icon="delete"/>
                </template>
                    <template #headerAppend>
                        <tr style="background-color:white">
                            <th colspan="4">
                                <Pagination
                                    :total="assemblies.count"
                                    :query="params"
                                />
                            </th>
                        </tr>
                    </template>
                </va-data-table>
            </div>
        </va-card-content>
    </va-card>
    </div>
</div>
</template>
<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import DataPortalService from "../../../services/DataPortalService";
import SubmissionService from "../../../services/SubmissionService";
import FormComponent from "./FormComponent.vue"
import NCBIClientService from '../../../services/clients/NCBIClientService'
import Pagination from '../../Pagination.vue'

const assemblyLoaded = ref(false)

const isLoading = ref(false)

const collapse = ref(true)

const requestCounter = ref(0)

const isValidAssembly = ref(false)

const accession = ref(null)

const initAssemblyTrack = {
    name:null,
    insdc_accession:null,
    fasta_location : null,
    fai_location: null,
    gzi_location: null,
    chrom_alias: null
}
const assemblyTrack = reactive({...initAssemblyTrack})

const initResponse = {
    organism_name:'',
    display_name:'',
    assembly_level:'',
}

const showAlert = ref(false)

const alert = reactive({
    title:'',
    color:'',
    message:''
})

const response = reactive({...initResponse})

const assemblyTrackOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'INSDC Accession', key:'insdc_accession', mandatory:true},
    {type:'input',label:'Fasta location', key:'fasta_location', mandatory:true},
    {type:'input',label:'fai location', key:'fai_location', mandatory:true},
    {type:'input',label:'gzi Location', key:'gzi_location', mandatory:true},
    {type:'input',label:'chromosome aliases file url', key:'chrom_alias'},
]

const assemblies = reactive({
    data:[],
    count:0
})

const initParams = {
    offset:0,
    limit:20,
    filter:null,
}

const params = reactive({...initParams})

onMounted(()=>{
    DataPortalService.getAssemblies(params)
    .then(resp => {
        assemblies.data = [...resp.data.data]
        assemblies.count = resp.data.total
    })
})

watch(params,()=>{
    DataPortalService.getAssemblies(params)
    .then(resp => {
    assemblies.data = [...resp.data.data]
    assemblies.count = resp.data.total
    })
})

const validAssemblyTrack = computed(()=>{
    return assemblyTrack.name && assemblyTrack.insdc_accession && assemblyTrack.fasta_location && assemblyTrack.fai_location && assemblyTrack.gzi_location
})

function editAssembly(assembly){
    Object.assign(assemblyTrack,initAssemblyTrack)
    response.organism_name = assembly.scientific_name
    response.display_name = assembly.assembly_name
    response.assembly_level = assembly.metadata.assembly_level || ''
    accession.value = assembly.accession
    if(assembly.track){
        Object.assign(assemblyTrack, assembly.track)
        collapse.value = true
    }
    isValidAssembly.value=true
    assemblyLoaded.value = true
}

function submitAssembly(){
    const trackToLoad = validAssemblyTrack?assemblyTrack:null
    SubmissionService.createAssemblyTrack(assemblyTrack,accession.value)
    .then(resp => {
        resetSelection()
        Object.assign(params,initParams)
        if(resp.data && resp.data.msg){
            alert.title = 'Success'
            alert.color = 'success'
            alert.message = resp.data.msg
            showAlert.value = true
        }
    })
    .catch(e => {
        console.log(e)
        alert.title = 'Error'
        alert.color = 'danger'
        alert.message = 'Something happened check the console log'
        showAlert.value = true
    })
}

function resetSelection(){
    accession.value=null
    Object.assign(response,initResponse)
    Object.assign(assemblyTrack,initAssemblyTrack)
    isValidAssembly.value = false
    assemblyLoaded.value=false
}

function getAssemblyFromNCBI(){
    isLoading.value=true
    //wait 1 second after each request to avoid being blocked
    if(requestCounter.value > 0){
        setTimeout(()=>1.0*1000)
        requestCounter.value = 0
    }
    NCBIClientService.getAssembly(accession.value)
    .then(resp => {
        requestCounter.value++
        if(resp.data && resp.data.total_count && resp.data.total_count >= 1){
            const assembly = resp.data.assemblies[0].assembly
            console.log(assembly)
            response.organism_name = assembly.org.sci_name
            response.display_name = assembly.display_name
            response.assembly_level = assembly.assembly_level
            isLoading.value=false
            isValidAssembly.value = true
            assemblyLoaded.value=true
        }else{
            isLoading.value=false
            isValidAssembly.value = false
            assemblyLoaded.value=false
        }
    })
    .catch(e => {
        requestCounter.value++
        console.log(e)
        isLoading.value=false
        isValidAssembly.value = false
        assemblyLoaded.value=false
    })
}

function deleteAssembly(assembly){

}
</script>