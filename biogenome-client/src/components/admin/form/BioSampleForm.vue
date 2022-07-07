<template>
<va-card>
    <va-card-title>
        Import biosample from INSDC
    </va-card-title>
    <va-card-content>
        <va-inner-loading
            :loading="isLoading"
        >
            <va-input 
                label="Search BioSample accession"
                placeholder="ex: SAMEA8748822"
                v-model="accession"
            >
                <template #append>
                    <va-chip :disabled="!accession" @click="getBioSampleFromEBI()" outline>Get BioSample</va-chip>
                </template>
            </va-input>
        </va-inner-loading>
    </va-card-content>
</va-card>
</template>
<script setup>
import { reactive, ref } from "vue"
import ENAClientService from "../../../services/clients/ENAClientService"
const accession = ref('')

const isLoading = ref(false)

function getBioSampleFromEBI(){
    isLoading.value = true
    ENAClientService.getBioSample(accession.value)
    .then(resp => {
        isLoading.value = false
        console.log(resp)
    })
}


</script>