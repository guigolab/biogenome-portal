<template>
<va-inner-loading :loading="authStore.isLoading">
    <div class="layout">
        <div class="row">
            <div class="flex">
                <h1 class="display-3">Assembly Form</h1>
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
                <va-card class="custom-card">
                    <va-card-title>
                        Import assembly from INSDC (*mandatory)
                    </va-card-title>
                    <va-card-content>
                        <ClientInput 
                            :label="'Assembly accession'"
                            :placeholder="'ex: GCA_905340225.1'"
                            :insdc-request="NCBIClientService.getAssembly"
                            :portal-request="AssemblyService.getAssembly"
                            :valid-data="isValidAssembly"
                            @on-response="parseResponse"
                            @on-reset="reset"
                        />
                    </va-card-content>
                </va-card>
                <div v-if="isValidAssembly">
                    <div class="row justify--space-between">
                        <div class="flex">
                            <h1 class="display-3">{{assemblyToSubmit.accession}}</h1>
                        </div>
                    </div>
                    <va-divider/>
                    <va-card class="custom-card">
                        <va-card-content v-if="isValidAssembly">
                            <ul>
                                <li style="padding:10px" v-for="key in Object.keys(response)" :key="key">
                                    <p style="text-align: start;"><strong>{{key+ ': '}}</strong>{{response[key]}}</p>
                                    <va-divider/>
                                </li>
                            </ul>
                        </va-card-content>
                    </va-card>
                    <div class="row justify--space-between">
                        <div class="flex">
                            <va-button @click="reset()" color="danger">
                                Reset Assembly
                            </va-button>
                        </div>
                        <div class="flex">
                            <va-button @click="submitAssembly()" :disabled="!isValidAssembly" >
                                Submit Assembly
                            </va-button>            
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</va-inner-loading>
</template>
<script setup>

import { reactive, ref } from "vue";
import NCBIClientService from '../../../services/clients/NCBIClientService'
import ClientInput from './ClientInput.vue'
import AssemblyService from "../../../services/AssemblyService";
import { auth } from "../../../stores/auth";
const response = ref(null)
const authStore = auth()
const showAlert = ref(false)

const isValidAssembly = ref(false)

const initAssemblyObj = {
    accession:''
}

const assemblyToSubmit = reactive({...initAssemblyObj})

const alert = reactive({
    title:'',
    color:'',
    message:''
})

function parseResponse(value){
    if(value.isError){
        Object.assign(alert,value.alert)
        showAlert.value=true
    }else{
        if(value.data && value.data.assemblies && value.data.assemblies.length){
            const assemblyToParse = value.data.assemblies[0].assembly
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
            return
        }
        alert.title="Error"
        alert.message=`No assembly with accession: ${value.id} has been found in INSDC`
        alert.color="danger"
        showAlert.value=true
        //no assembly found
    }
}

function submitAssembly(){
    authStore.isLoading=true
    AssemblyService.importAssembly(assemblyToSubmit.accession)
    .then(resp => {
        console.log(resp)
        alert.title = "Success"
        alert.message = resp.data
        alert.color = "success"
        authStore.isLoading=false
        showAlert.value=true
        reset()
        window.scrollTo({ top: 0, behavior: 'smooth' });
    })
    .catch(errors => {
        console.log(errors)
        alert.title = "Error"
        alert.message = errors.response ? errors.response.data:errors
        alert.color = "danger"
        authStore.isLoading=false
        showAlert.value=true
        window.scrollTo({ top: 0, behavior: 'smooth' });
    })
}

function reset(){
    Object.assign(assemblyToSubmit,initAssemblyObj)
    response.value = null
    isValidAssembly.value = false
}


</script>