<template>
    <div class="row">
        <div class="flex">
            <va-input :loading="isLoading" v-model="organismStore.filter" placeholder="Type a NCBI Taxonomic identifier"
                :error="!organismStore.isValid">
            </va-input>
        </div>
        <div class="flex">
            <va-button :disabled="organismStore.filter.length < 1 || !organismStore.isValid" type="submit" icon="search"
                @click="getTaxonFromENA()">Search
            </va-button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import ENAClientService from '../services/ENAService'
import { useToast } from 'vuestic-ui/web-components';
import { useOrganismStore } from '../stores/organism-store'
import { AxiosError } from 'axios';
import ItemService from '../services/ItemService';


const { init } = useToast()
const isLoading = ref(false)
const organismStore = useOrganismStore()

watchEffect(async () => {
    try {
        await ItemService.getItem('organisms', organismStore.filter)
        organismStore.isValid = false
        init({ message: `An organism with taxid ${organismStore.filter} already exists in the db`, color: 'danger' })
    } catch {
        organismStore.isValid = true
    }
})

async function getTaxonFromENA() {
    try {
        isLoading.value = true
        const { data } = await ENAClientService.getTaxon(organismStore.filter)
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