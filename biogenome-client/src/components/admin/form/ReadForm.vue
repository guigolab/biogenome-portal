<template>
<va-card>
    <va-card-title>
        Import Read from INSDC
    </va-card-title>
    <va-card-content>
        <!-- <va-inner-loading
            :loading="isLoading"
        >
            <va-input 
                label="Search Experiment accession"
                placeholder="ex: ERX6313174"
                v-model="accession"
            >
                <template #append>
                    <va-chip :disabled="!accession" @click="getReadFromEBI()" outline>Get Assembly</va-chip>
                </template>
            </va-input>
        </va-inner-loading> -->
        <ClientInput 
            :id="accession"
            :label="'Search Experiment accession'"
            :placeholder="'ex: ERX6313174'"
            :request="ENAClientService.getRead"
        />
    </va-card-content>
</va-card>
</template>
<script setup>
import ClientInput from '../../ClientInput.vue'
import { reactive, ref } from "vue"
import ENAClientService from "../../../services/clients/ENAClientService"
const accession = ref('')
const isLoading = ref(false)

function getReadFromEBI(){
    isLoading.value = true
    ENAClientService.getRead(accession.value)
    .then(resp => {
        isLoading.value = false
        console.log(resp)
    })
}


</script>