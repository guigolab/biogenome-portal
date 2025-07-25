<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaInput v-model="taxonFilter" placeholder="Type a valid scientific name or a taxid" clearable
                :messages="['Specie names can change over time, so it is recommended to use the taxid']"
                @keyup.enter="search">
                <template #append>
                    <VaButton :loading="taxonSearchLoading" :disabled="!taxonFilter" icon="search" @click="search">
                        Search
                    </VaButton>
                </template>
            </VaInput>
        </div>
        <div v-if="taxons.length" class="flex lg12 md12 sm12 xs12">
            <div class="row">
                <div class="flex">
                    <p>Confirm the organism you want to select</p>
                </div>
            </div>
            <div class="row">
                <div class="flex" v-for="taxon in taxons" :key="taxon.taxId">
                    <VaCard stripe-color="success" :stripe="selectedTaxon?.taxId === taxon.taxId">
                        <VaCardContent>
                            <h5 class="text-h5">{{ taxon.scientificName }}</h5>
                            <p class="va-text-secondary">Taxid: {{ taxon.taxId }}</p>
                            <p v-if="taxon.lineage && typeof taxon.lineage === 'string'" class="va-text-secondary">{{
                                taxon.lineage.split(';').join(' > ') }}</p>
                        </VaCardContent>
                        <VaCardActions>
                            <VaButton size="small" @click="selectTaxon(taxon)">Select</VaButton>
                        </VaCardActions>
                    </VaCard>
                </div>
            </div>
        </div>

        <div v-if="goToUpdateForm && selectedTaxon" class="flex lg12 md12 sm12 xs12">
            <VaCard stripe-color="warning" stripe>
                <VaCardContent>
                    <p>The organism you are looking for is already present in the database</p>
                    <p>You can update the organism data by clicking on the button below</p>
                </VaCardContent>
                <VaCardActions>
                    <VaButton preset="primary"
                        :to="{ name: 'update-organism', params: { taxid: selectedTaxon.taxId } }">
                        Update
                        organism</VaButton>
                </VaCardActions>
            </VaCard>
        </div>
        <div v-if="notFoundInDB" class="flex lg12 md12 sm12 xs12">
            <VaCard stripe-color="warning" stripe>
                <VaCardContent>
                    <p>No organisms found in the database, refine your search or create a new organism</p>
                </VaCardContent>
                <VaCardActions>
                    <VaButton preset="primary" :to="{ name: 'create-organism' }">Create new organism</VaButton>
                </VaCardActions>
            </VaCard>
        </div>
        <div v-if="unauthorized" class="flex lg12 md12 sm12 xs12">
            <VaCard stripe-color="danger" stripe>
                <VaCardContent>
                    <p>You are not authorized to update this organism</p>
                </VaCardContent>
            </VaCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from 'vuestic-ui';
import NCBIService from '../../services/NCBIService';
import EBI from '../../services/EBIService';
import { AxiosError } from 'axios';
import CommonService from '../../services/CommonService';
import { useGlobalStore } from '../../stores/global-store';

const props = defineProps<{
    isOrganismCreation?: boolean
}>()

const taxonFilter = ref('')
const taxonSearchLoading = ref(false)
const unauthorized = ref(false)
const notFoundInDB = ref(false)
const goToUpdateForm = ref(false)
const taxons = ref<Array<{
    taxId: string,
    scientificName: string,
    lineage?: string
}>>([])
const { init } = useToast()
const selectedTaxon = ref<{
    taxId: string,
    scientificName: string,
    lineage?: string
} | null>(null)

const globalStore = useGlobalStore()
const isAdmin = computed(() => globalStore.userRole === 'Admin')
const userSpecies = computed(() => globalStore.userSpecies)
const isTaxId = computed(() => !isNaN(Number(taxonFilter.value)))

const emits = defineEmits(['selected'])

async function search() {
    if (!taxonFilter.value.trim()) {
        init({ message: 'Please enter a search term', color: 'warning' })
        return
    }

    clearSearch()
    taxonSearchLoading.value = true

    try {
        if (props.isOrganismCreation) {
            await searchExternalTaxons()
        } else {
            await searchDatabaseTaxons()
        }
    } catch (error) {
        console.error('Search error:', error)
        init({ message: 'An error occurred during search', color: 'danger' })
    } finally {
        taxonSearchLoading.value = false
    }
}

function clearSearch() {
    taxons.value = []
    notFoundInDB.value = false
    unauthorized.value = false
    selectedTaxon.value = null
    goToUpdateForm.value = false
}

async function searchExternalTaxons() {
    try {
        // Try NCBI first, then EBI as fallback
        const ncbiResult = await searchNCBI()
        if (ncbiResult && ncbiResult.length > 0) {
            taxons.value = [...ncbiResult]
            return
        }

        const ebiResult = await searchEBI()
        if (ebiResult && ebiResult.length > 0) {
            taxons.value = [...ebiResult]
            return
        }

        init({ message: 'Organism not found in external databases', color: 'danger' })
    } catch (error) {
        console.error('External search error:', error)
        init({ message: 'Error searching external databases', color: 'danger' })
    }
}

async function searchNCBI() {
    try {
        const { data } = await NCBIService.getTaxon(taxonFilter.value)
        if (!data.taxonomy_nodes?.length || data.taxonomy_nodes[0].errors) {
            return []
        }

        return data.taxonomy_nodes.map((node: any) => ({
            taxId: node.taxonomy.tax_id.toString(),
            scientificName: node.taxonomy.organism_name,
            lineage: node.taxonomy.lineage
        }))
    } catch (error) {
        console.error('NCBI search error:', error)
        return []
    }
}

async function searchEBI() {
    try {
        const subPath = isTaxId.value ? 'tax-id' : 'scientific-name'
        const { data } = await EBI.getTaxon(subPath, taxonFilter.value)
        if (data) {
            return data
        }
        return []
    } catch (error) {
        console.error('EBI search error:', error)
        return []
    }
}

async function searchDatabaseTaxons() {
    try {
        const databaseTaxons = await getTaxonsFromDB()
        if (databaseTaxons.length > 0) {
            taxons.value = [...databaseTaxons]
        } else {
            notFoundInDB.value = true
            init({ message: 'No organisms found in the database, refine your search', color: 'warning' })
        }
    } catch (error) {
        console.error('Database search error:', error)
        init({ message: 'Error searching database', color: 'danger' })
    }
}

async function getTaxonsFromDB() {
    try {
        const { data } = await CommonService.getItems('organisms', { 'filter': taxonFilter.value })
        return data.data.map((taxon: any) => ({
            taxId: taxon.taxid,
            scientificName: taxon.scientific_name,
            lineage: taxon.lineage
        }))
    } catch (error) {
        console.error('Database query error:', error)
        init({ message: 'Error querying database', color: 'danger' })
        return []
    }
}

async function selectTaxon(taxon: { taxId: string, scientificName: string, lineage?: string }) {
    selectedTaxon.value = { ...taxon }
    unauthorized.value = false
    if (props.isOrganismCreation) {
        // For creation, check if organism already exists
        await checkExistingOrganism(taxon)
        return
    }
    if (!isAdmin.value && !userSpecies.value.includes(taxon.taxId)) {
        unauthorized.value = true
        init({ message: `The organism ${taxon.scientificName} already exists in the database, but you haven't the rights to modify its data`, color: 'danger' })
        return
    }
    // For linking, emit the selected taxon
    emits('selected', {
        scientificName: taxon.scientificName,
        taxId: taxon.taxId
    })
}

async function checkExistingOrganism(taxon: { taxId: string, scientificName: string, lineage?: string }) {
    try {
        const { data } = await CommonService.getItem('organisms', taxon.taxId)
        if (data && data.taxid === taxon.taxId) {
            if (isAdmin.value || userSpecies.value.includes(taxon.taxId)) {
                goToUpdateForm.value = true
                init({ message: `The organism ${taxon.scientificName} already exists in the database, you can update its data by clicking on the button: Update organism`, color: 'warning' })

            } else {
                unauthorized.value = true
                init({ message: `The organism ${taxon.scientificName} already exists in the database, but you haven't the rights to modify its data`, color: 'danger' })
            }
            return
        }

    } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.response?.status === 404) {
            // Organism doesn't exist, proceed with creation
            emits('selected', {
                scientificName: taxon.scientificName,
                taxId: taxon.taxId
            })
        } else {
            console.error('Error checking existing organism:', error)
            init({ message: 'Error checking existing organism', color: 'danger' })
        }
    }
}
</script>