<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaInput v-model="taxonFilter" placeholder="Type a scientific name or a taxid" clearable
                :messages="['Type a valid taxonomic identifier or a scientific name and click on the search button']"
                @keyup.enter="search">
                <template #append>
                    <VaButton :loading="taxonSearchLoading" :disabled="!taxonFilter" type="submit" icon="search"
                        @click="search">Search
                    </VaButton>
                </template>
            </VaInput>
        </div>
        <div v-if="taxons.length" class="flex lg12 md12 sm12 xs12">
            <VaSelect placeholder="Confirm organism selection" v-model="selectedTaxon" :options="taxons"
                @update:model-value="setTaxon" :text-by="(t: any) => `${t.sci_name} (${t.tax_id})`"
                :rules="[(v: any) => !!v || 'Taxon selection is mandatory', (v: any) => !unauthorized || 'You dont have the rights to use this organism']">
            </VaSelect>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from 'vuestic-ui';
import NCBIService from '../../services/NCBIService';
import { AxiosError } from 'axios';
import CommonService from '../../services/CommonService';
import { useGlobalStore } from '../../stores/global-store';


const props = defineProps<{
    isOrganismCreation: boolean
}>()

const taxonFilter = ref('')
const taxonSearchLoading = ref(false)
const selectedTaxon = ref(null)
const unauthorized = ref(false)
const taxons = ref<Record<string, any>[]>([])
const { init } = useToast()

const globalStore = useGlobalStore()
const isDataManager = computed(() => globalStore.userRole === 'DataManager')
const userSpecies = computed(() => globalStore.userSpecies)

const emits = defineEmits(['selected'])

async function search() {
    taxonSearchLoading.value = true
    await getTaxons()
    taxonSearchLoading.value = false
}

async function getTaxons() {
    try {
        taxonSearchLoading.value = true
        const { data } = await NCBIService.getTaxon(taxonFilter.value)
        if (!data.sci_name_and_ids) {
            init({ message: 'Organism not found in NCBI', color: 'danger' })
            return
        }
        taxons.value = [...data.sci_name_and_ids]
    } catch (error) {
        console.log(error)
        const axiosError = error as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        taxonSearchLoading.value = false
    }
}

async function setTaxon(taxon: { sci_name: string, tax_id: string }) {
    //check if the taxon exists in the database and user has access to it
    try {
        const { data } = await CommonService.getItem('organisms', taxon.tax_id)
        if (props.isOrganismCreation) {
            init({ message: `The organism ${taxon.sci_name} already exists in the db`, color: 'danger' })
            unauthorized.value = true
            return
        }
        if (isDataManager.value && !userSpecies.value.includes(data.data[0].taxid)) {
            init({ message: `The organism ${taxon.sci_name} already exists in the db, but you haven't the rights to modify its data`, color: 'danger' })
            unauthorized.value = true
        } else {
            unauthorized.value = false
        }
    } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.response?.status === 404) {
            unauthorized.value = false
        } else {
            init({ message: 'Unhandled error, check the logs', color: 'danger' })
            console.error(error)
            unauthorized.value = true
        }
    } finally {
        if (!unauthorized.value) {
            emits('selected', { scientificName: taxon.sci_name, taxid: taxon.tax_id })
        }
    }

}

</script>