<template>
    <VaCard>
        <VaCardContent>
            <h2 class="va-h6">
                Organism Selection
            </h2>
            <p class="va-text-secondary">
                Search in the NCBI database and select one organism
            </p>
        </VaCardContent>
        <VaCardContent>
            <VaAlert v-if="taxonExists" color="danger">
                Organism already present in the db
            </VaAlert>
            <VaForm tag="form" @submit.prevent="search">
                <VaInput :loading="isLoading" v-model="organismStore.filter"
                    placeholder="Type a scientific name or a taxid">
                    <template #append>
                        <VaButton color="danger" @click="reset" :disabled="!organismStore.filter" preset="secondary"
                            icon="close">Reset
                        </VaButton>
                        <VaButton :loading="isLoading" :disabled="taxonExists" type="submit" icon="search">Search
                        </VaButton>
                    </template>
                </VaInput>
            </VaForm>
        </VaCardContent>
        <VaCardContent v-if="taxons.length">
            <VaSelect placeholder="Confirm organism selection" v-model="selectedTaxon" :options="taxons"
                @update:model-value="setTaxon" :text-by="(t: any) => `${t.sci_name} (${t.tax_id})`">
            </VaSelect>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import NCBIService from '../../services/NCBIService'
import { useToast } from 'vuestic-ui/web-components';
import { useOrganismStore } from '../../stores/organism-store'
import { AxiosError } from 'axios';
import ItemService from '../../services/CommonService';


const { init } = useToast()
const isLoading = ref(false)
const organismStore = useOrganismStore()
const taxons = ref<Record<string, any>[]>([])
const taxonExists = ref(false)

const selectedTaxon = ref<Record<string, any> | null>(null)
async function checkTaxonExists() {
    const { filter } = organismStore
    try {
        const { data } = await ItemService.getItems('organisms', { filter })
        taxonExists.value = data.total > 0
        if (taxonExists.value) {
            init({ message: `${organismStore.filter} already exists in the db`, color: 'danger' })
        }
    } catch (e) {
        console.log(e)
    }

}

async function search() {
    isLoading.value = true
    await checkTaxonExists()
    if (!taxonExists.value) await getTaxons()
    isLoading.value = false
}

function reset() {
    organismStore.filter = ''
    taxonExists.value = false
    taxons.value = []
}


async function getTaxons() {
    try {
        const { data } = await NCBIService.getTaxon(organismStore.filter)
        if (!data.sci_name_and_ids) {
            init({ message: 'Organism not found in NCBI', color: 'danger' })
            return
        }
        taxons.value = [...data.sci_name_and_ids]
    } catch (error) {
        console.log(error)
        const axiosError = error as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    }
}

function setTaxon() {
    if (!selectedTaxon.value) return
    organismStore.organismForm.taxid = selectedTaxon.value.tax_id
    organismStore.organismForm.scientific_name = selectedTaxon.value.sci_name
}
</script>