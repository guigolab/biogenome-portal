<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <TaxonHeader :taxid="taxid" />
            <VaTabs :key="taxid" v-model="tab">
                <template #tabs>
                    <VaTab  name="wiki" :label="t('tabs.wiki')"></VaTab>
                    <VaTab :key="validTab" v-for="validTab in validTabs" :label="t(`tabs.${validTab}`)" :name="validTab">
                    </VaTab>
                    <VaTab v-if="coordinates.length" :label="t('tabs.map')" name="map"></VaTab>
                </template>
            </VaTabs>
            <VaDivider style="margin-top: 0;" />
            <div v-if="isDataModel(tab)" class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <ItemsBlock :parent_taxon="taxid" :columns="models[tab as DataModel].columns"
                        :filters="(models[tab as DataModel].filters as Filter[])" :model="(tab as DataModel)" />
                </div>
            </div>
            <div class="row" v-else-if="tab === 'map'">
                <div style="height: 450px;" class="flex lg12 md12 sm12 xs12">
                    <LeafletMap :coordinates="coordinates" />
                </div>
            </div>
            <div class="row" v-else>
                <div class="flex lg12 md12 sm12 xs12">
                    <Wikipedia />
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { SampleLocations, Filter } from '../../data/types'
import TaxonService from '../../services/clients/TaxonService'
import { models } from '../../../config.json'
import TaxonHeader from './components/TaxonHeader.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import ItemsBlock from '../common/components/ItemsBlock.vue'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Wikipedia from './components/Wikipedia.vue'

const props = defineProps<{
    taxid: string
}>()

type DataModel = keyof typeof models;

const coordinates = ref<SampleLocations[]>([])

const currentTaxonStats = ref<Record<string, number>>()

const tab = ref('wiki')

// watch(() => props.taxid, async (v) => {
//     if (v) {
//         tab.value = 'wiki'
//         await getStats(v)
//         await getCoordinates(v)
//     }
// })

watchEffect(async () => {
    tab.value = 'wiki'
    await getStats(props.taxid)
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

</script>