<template>
<va-inner-loading :loading="authStore.isLoading">
    <div class="layout">
        <div class="row">
            <div class="flex">
                <h1 class="display-3">Read Form</h1>
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
                        Import Read from INSDC
                    </va-card-title>
                    <va-card-content>
                        <ClientInput 
                            :label="'Experiment accession'"
                            :placeholder="'ex: ERX6313174'"
                            :insdc-request="ENAClientService.getRead"
                            :portal-request="ReadService.getRead"
                            :valid-data="validRead"
                            @on-response="parseResponse"
                            @on-reset="reset"
                        />
                    </va-card-content>
                </va-card>
                <div v-if="validRead">
                    <div class="row">
                        <div class="flex">
                            <h1 class="display-3">{{readToSubmit.scientific_name}}</h1>
                        </div>
                    </div>
                    <va-divider/>
                    <va-card class="custom-card">
                        <va-card-content v-if="validRead">
                            <ul>
                                <li style="padding:10px" v-for="key in Object.keys(readToSubmit)" :key="key">
                                    <p style="text-align: start;"><strong>{{key+ ': '}}</strong>{{readToSubmit[key]}}</p>
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
                                Submit Read
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
import ClientInput from './ClientInput.vue'
import { reactive, ref } from "vue"
import ENAClientService from "../../../services/clients/ENAClientService"
import ReadService from '../../../services/ReadService'
import { auth } from '../../../stores/auth'

const authStore = auth()
const accession = ref('')
const showAlert = ref(false)

const validRead = ref(false)

const readToSubmit = ref(null)

const initAlert = {
    title:'',
    color:'',
    message:''
}

const alert = reactive({...initAlert})


function parseResponse(value){
    if(value.isError){
        Object.assign(alert,value.alert)
        showAlert.value=true
    }else{
        if(value.data.length){
            readToSubmit.value = value.data[0]
            accession.value = value.id
            validRead.value = true
        }
    }
}

function reset(){
    validRead.value = false
    readToSubmit.value = null
    accession.value=''
}

function submit(){
    authStore.isLoading=true
    ReadService.importReads(accession.value)
    .then(resp => {
        if(resp.status === 201){
            alert.title='Success'
            alert.color='success'
            alert.message=resp.data+' correctly inserted'
            reset()
            showAlert.value=true
            authStore.isLoading=false
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return
        }
        alert.title='Error'
        alert.color='danger'
        alert.message=resp.data
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