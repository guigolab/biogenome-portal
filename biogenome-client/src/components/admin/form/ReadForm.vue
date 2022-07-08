<template>
<va-inner-loading :loading="isLoading">
    <va-card>
        <va-card-content>
            <va-alert closeable v-model="showAlert" :title="alert.title" border="left" :border-color="alert.color">
                {{alert.message}}
            </va-alert>
        </va-card-content>
        <va-card-title>
            Import Read from INSDC
        </va-card-title>
        <va-card-content>
            <ClientInput 
                :label="'Search Experiment accession'"
                :placeholder="'ex: ERX6313174'"
                :request="ENAClientService.getRead"
                @on-response="parseResponse"
            />
        </va-card-content>
        <va-divider/>
        <va-card-title v-if="validRead">
            {{accession}}
        </va-card-title>
        <va-card-content v-if="validRead">
            <ul>
                <li style="padding:10px" v-for="key in Object.keys(readToSubmit)" :key="key">
                    <p style="text-align: start;"><strong>{{key+ ': '}}</strong>{{readToSubmit[key]}}</p>
                    <va-divider/>
                </li>
            </ul>
        </va-card-content>
        <va-divider/>
        <va-card-actions v-if="validRead"> 
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
        </va-card-actions>
    </va-card>
</va-inner-loading>
</template>
<script setup>
import ClientInput from '../../ClientInput.vue'
import { reactive, ref } from "vue"
import ENAClientService from "../../../services/clients/ENAClientService"
import ReadService from '../../../services/ReadService'

const isLoading = ref(false)

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
    console.log(value)
    if(value.isError){
        alert.message = `${value.id} not found`
        alert.color = 'danger'
        showAlert.value = true
        return
    }
    //get element in array
    if(value.response.data.length){
        readToSubmit.value = value.response.data[0]
        accession.value = value.id
        validRead.value = true
    }
}

function reset(){
    validRead.value = false
    readToSubmit.value = null
    accession.value=''
}

function submit(){
    isLoading.value=true
    ReadService.importReads(accession.value)
    .then(resp => {
        console.log(resp)
        const response = resp.data
        if(response.success){
            alert.title='Success'
            alert.color='success'
            alert.message=response.message+' correctly inserted'
            reset()
            showAlert.value=true
            return
        }
        alert.title='Error'
        alert.color='danger'
        alert.message=response.message
        showAlert.value=true
        isLoading.value = false
    }).catch(e => {
        console.log(e)
        alert.title='Error'
        alert.color='danger'
        alert.message=e
        showAlert.value=true
        isLoading.value = false
    })
}
</script>