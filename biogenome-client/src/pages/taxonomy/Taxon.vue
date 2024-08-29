<template>
    <VaInnerLoading :style="{ display: isLoading ? 'inherit' : 'initial' }" :size="50" :loading="isLoading">
        <VaCard>
            <VaCardContent v-if="taxon">
                <h2 class="va-h2"> {{ taxon.name }}
                </h2>
            </VaCardContent>
            <VaTabs :key="taxid" v-model="tab">
                <template #tabs>
                    <VaTab name="wiki" :label="t('tabs.wiki')"></VaTab>
                    <VaTab :key="validTab" v-for="validTab in validTabs" :label="t(`tabs.${validTab}`)"
                        :name="validTab">
                    </VaTab>
                    <VaTab v-if="coordinates.length" :label="t('tabs.map')" name="map"></VaTab>
                </template>
            </VaTabs>
            <VaDivider style="margin-top: 0;" />
            <VaCardContent>
                <div class="row">
                    <div style="min-height: 450px;" class="flex lg12 md12 sm12 xs12">
                        <ItemsBlock v-if="isDataModel(tab)" :parent_taxon="taxid"
                            :columns="models[tab as DataModel].columns"
                            :filters="(models[tab as DataModel].filters as Filter[])" :model="(tab as DataModel)" />
                        <LeafletMap v-else-if="tab === 'map'" :coordinates="coordinates" />
                        <Wikipedia v-else />
                    </div>
                </div>
            </VaCardContent>
        </VaCard>
    </VaInnerLoading>
</template>
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { SampleLocations, Filter, TreeNode } from '../../data/types'
import { models } from '../../../config.json'
import GeoLocationService from '../../services/clients/GeoLocationService'
import ItemsBlock from '../common/components/ItemsBlock.vue'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Wikipedia from './components/Wikipedia.vue'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { AxiosError } from 'axios';
import { useToast } from 'vuestic-ui/web-components';
import TaxonService from '../../services/clients/TaxonService'

const { init } = useToast()
const taxonomyStore = useTaxonomyStore()
const taxon = ref<TreeNode>()

const props = defineProps<{
    taxid: string
}>()

type DataModel = keyof typeof models;

const coordinates = ref<SampleLocations[]>([])

const currentTaxonStats = ref<Record<string, number>>()

const tab = ref('wiki')

const isLoading = ref(false)

watchEffect(async () => {
    tab.value = 'wiki'
    isLoading.value = true
    await Promise.all([getTaxon(props.taxid), getStats(props.taxid)])
    isLoading.value = false
    await getCoordinates(props.taxid)
})

const { t } = useI18n()

const validTabs = computed(() => {
    if (currentTaxonStats.value) {
        const tabs = Object.entries(currentTaxonStats.value).filter(([k, v]) => v && Object.keys(models).includes(k))
            .map(([k, v]) => k)
        return tabs
    }
    return []
})

function isDataModel(str: string): boolean {
    return Object.keys(models).includes(str);
}

async function getStats(taxid: string) {
    currentTaxonStats.value = undefined
    const { data } = await TaxonService.getTaxonStats(taxid)
    currentTaxonStats.value = { ...data }
}

async function getCoordinates(taxid: string) {
    const { data } = await GeoLocationService.getLocationsByTaxon(taxid)
    coordinates.value = [...data]
}

async function getTaxon(taxid: string) {
    try {
        const { data } = await TaxonService.getTaxon(taxid)
        taxon.value = { ...data }
        taxonomyStore.currentTaxon = { ...data }
        taxonomyStore.taxidQuery = taxid
    } catch (error) {
        const axiosError = error as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    }
}
</script>