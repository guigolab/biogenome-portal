<template>
<va-inner-loading :loading="authStore.isLoading">
    <div class="layout">
        <div class="row">
            <div class="flex">
                <h1 class="display-3">BioSample Form</h1>
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
        <va-card class="custom-card">
            <va-card-title>
                Import biosample from INSDC
            </va-card-title>
            <va-card-content>
                <ClientInput 
                    :label="'INSDC BioSample accession'"
                    :placeholder="'ex: SAMEA14448454'"
                    :insdc-request="ENAClientService.getBioSample"
                    :portal-request="BioSampleService.getBioSample"
                    :valid-data="validBiosample"
                    @on-response="parseResponse"
                    @on-reset="reset"
                />
            </va-card-content>
        </va-card>
        <div v-if="validBiosample">
            <div class="row">
                <div class="flex">
                    <h1 class="display-3">{{accession}}</h1>
                </div>
            </div>
            <va-divider/>
            <va-card class="custom-card">
                <va-card-content v-if="validBiosample">
                    <ul>
                        <li style="padding:10px" v-for="key in Object.keys(biosampleToSubmit)" :key="key">
                            <p style="text-align: start;"><strong>{{key+ ': '}}</strong>{{biosampleToSubmit[key]}}</p>
                            <va-divider/>
                        </li>
                    </ul>
                </va-card-content>
            </va-card>
            <div class="row justify--space-between">
                <div class="flex">
                    <va-button @click="reset()" color="danger">
                        Cancel
                    </va-button>
                </div>
                <div class="flex">
                    <va-button @click="submit()">
                        Submit Biosample
                    </va-button>            
                </div>
            </div>
        </div>
    </div>
</va-inner-loading>

</template>
<script setup>
import { reactive, ref } from "vue"
import ClientInput from './ClientInput.vue'
import ENAClientService from "../../../services/clients/ENAClientService"
import BioSampleService from "../../../services/BioSampleService"
import DataPortalService from "../../../services/DataPortalService"
import { auth } from "../../../stores/auth"

const authStore = auth()
const accession = ref('')

const showAlert = ref(false)

const validBiosample = ref(false)

const biosampleToSubmit = ref(null)

const initAlert = {
    title:'',
    color:'',
    message:''
}

const alert = reactive({...initAlert})


function parseResponse(value){
    if(value.isError){
        Object.assign(alert,value.alert)
        showAlert.value = true
        return
    }else{
        if(value.data && value.data._embedded){
            var metadata = {}
            const characteristics = value.data._embedded.samples[0].characteristics
            Object.keys(characteristics).forEach(k => {
                metadata[k] = characteristics[k][0].text
            })
            biosampleToSubmit.value = {...metadata}
            accession.value = value.id
            validBiosample.value = true
            return
        }
        alert.title="Error"
        alert.message=`No biosample with accession: ${value.id} has been found in INSDC`
        alert.color="danger"
        showAlert.value=true
    }    
}

function reset(){
    validBiosample.value = false
    biosampleToSubmit.value = null
    accession.value=''
}

function submit(){
    authStore.isLoading=true
    BioSampleService.importBioSample(accession.value)
    .then(resp => {
        const response = resp.data
        if(resp.status === 201){
            alert.title='Success'
            alert.color='success'
            alert.message=resp.data
            reset()
            showAlert.value=true
            authStore.isLoading = false
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return
        }
        alert.title='Error'
        alert.color='danger'
        alert.message=response.data
        showAlert.value=true
        authStore.isLoading = false
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(e => {
        console.log(e)
        alert.title='Error'
        alert.color='danger'
        alert.message=e
        showAlert.value=true
        authStore.isLoading = false
        window.scrollTo({ top: 0, behavior: 'smooth' });
    })
}
</script>