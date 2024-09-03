<template>
    <VaInnerLoading :style="{ display: taxonomyStore.isContentLoading ? 'inherit' : 'initial' }" :size="50"
        :loading="taxonomyStore.isContentLoading">
        <VaCard>
            <VaCardContent v-if="taxonomyStore.currentTaxon">
                <Header :name="taxonomyStore.currentTaxon.name" />
            </VaCardContent>
            <Tabs :tabs="validTabs" :tab="tab" @update-view="(v: string) => tab = v" />
            <VaCardContent :key="taxid">
                <div class="row">
                    <div style="min-height: 450px;" class="flex lg12 md12 sm12 xs12">
                        <ItemsBlock v-if="isDataModel(tab)" :parent_taxon="taxid"
                            :columns="models[tab as DataModel].columns"
                            :filters="(models[tab as DataModel].filters as Filter[])" :model="(tab as DataModel)" />
                        <LeafletMap v-else-if="tab === 'map'" :lineage="taxid" />
                        <Wikipedia v-else />
                    </div>
                </div>
            </VaCardContent>
        </VaCard>
    </VaInnerLoading>
</template>
<script setup lang="ts">
import {  onMounted, ref, watchEffect } from 'vue'
import { Filter } from '../../data/types'
import { models } from '../../../config.json'
import GeoLocationService from '../../services/clients/GeoLocationService'
import ItemsBlock from '../common/components/ItemsBlock.vue'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Wikipedia from './components/Wikipedia.vue'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { AxiosError } from 'axios';
import { useToast } from 'vuestic-ui/web-components';
import TaxonService from '../../services/clients/TaxonService'
import Tabs from '../../components/common/Tabs.vue'
import Header from './components/Header.vue'


const { init } = useToast()
const taxonomyStore = useTaxonomyStore()

const props = defineProps<{
    taxid: string
}>()

type DataModel = keyof typeof models;

const coordinates = ref(0)

const currentTaxonStats = ref<Record<string, number>>()

const tab = ref('')

const isLoading = ref(false)

watchEffect(async () => {
    await getTaxon(props.taxid)
    await getStats(props.taxid)
    await getCoordinates(props.taxid)
    setTabs()
})

onMounted(async () => {
    if (!taxonomyStore.treeData) await taxonomyStore.getTree()
})

const validTabs = ref<{ label: string, name: string }[]>([])

function setTabs() {
    const t = [{ name: 'wiki', label: 'tabs.wiki' }]
    if (currentTaxonStats.value) {
        const tabs = Object.entries(currentTaxonStats.value).filter(([k, v]) => v && Object.keys(models).includes(k))
            .map(([k, v]) => { return { name: k, label: `tabs.${k}` } })
        t.push(...tabs)
    }
    if (coordinates.value) t.push({ name: 'map', label: 'tabs.map' })
    validTabs.value = [...t]
}

function isDataModel(str: string): boolean {
    return Object.keys(models).includes(str);
}

async function getStats(taxid: string) {
    currentTaxonStats.value = undefined
    const { data } = await TaxonService.getTaxonStats(taxid)
    currentTaxonStats.value = { ...data }
}

async function getCoordinates(taxid: string) {
    const { data } = await GeoLocationService.getLocations({ lineage: taxid, limit: 2 })
    coordinates.value = data.total
}

async function getTaxon(taxid: string) {
    isLoading.value = true
    try {
        const { data } = await TaxonService.getTaxon(taxid)
        taxonomyStore.currentTaxon = { ...data }
        taxonomyStore.taxidQuery = taxid
    } catch (error) {
        const axiosError = error as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        isLoading.value = false
    }
}
</script>