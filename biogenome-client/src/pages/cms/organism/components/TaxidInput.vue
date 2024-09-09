<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-input :loading="isLoading" v-model="input" style="padding-bottom: 10px"
                label="Taxonomic identifier (NCBI)" placeholder="Insert a valid NCBI Taxonomic identifier"
                :rules="[(v: string) => v.length > 0 || 'Value is mandatory', (v: string) => isValid || 'An organism with this taxid already exists']">
                <template #append>
                    <va-button :disabled="input.length < 1" type="submit" icon="search"
                        @click="getTaxonFromENA()">Search
                    </va-button>
                </template>
            </va-input>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import OrganismService from '../../../../services/clients/OrganismService'
import ENAClientService from '../../../../services/clients/ENAClientService'
import { useToast } from 'vuestic-ui/web-components';
import { useOrganismStore } from '../../../../stores/organism-store'
import { AxiosError } from 'axios';


const { init } = useToast()
const input = ref('')
const isValid = ref(true)
const isLoading = ref(false)
const organismStore = useOrganismStore()

watchEffect(async () => {
    try {
        await OrganismService.getOrganism(input.value)
        isValid.value = false
    } catch {
        isValid.value = true
    }
})

async function getTaxonFromENA() {
    try {
        isLoading.value = true
        const { data } = await ENAClientService.getTaxon(input.value)
        if (data && data.length) {
            const { tax_id, description } = data[0]
            organismStore.organismForm.taxid = tax_id
            organismStore.organismForm.scientific_name = description
        } else {
            init({ message: 'Taxid not found', color: 'danger' })
        }
    } catch (error) {
        const axiosError = error as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        isLoading.value = false
    }
}
</script>