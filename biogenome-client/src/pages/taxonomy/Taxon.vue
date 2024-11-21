<template>
    <VaCardTitle class="pb-0">
        Overview of:
    </VaCardTitle>
    <VaInnerLoading :style="{ display: taxonomyStore.isContentLoading ? 'inherit' : 'initial' }" :size="50"
        :loading="taxonomyStore.isContentLoading">
        <VaCardContent class="pt-0 pb-10" v-if="taxonomyStore.currentTaxon">
            <h2 class="va-h2"> {{ taxonomyStore.currentTaxon.name }}</h2>
            <WikiSummary :name="taxonomyStore.currentTaxon.name" :rank="taxonomyStore.currentTaxon.rank" />
        </VaCardContent>
        <VaTabs v-if="currentTaxonStats" :key="validTabs.length" v-model="tab" @update:model-value="updateView">
            <template #tabs>
                <VaTab :label="`${t(validTab.label)}: ${currentTaxonStats[validTab.name]}`" :icon="validTab.icon"
                    :name="validTab.name" v-for="validTab in validTabs" :key="validTab.name">
                </VaTab>
                <VaTab v-if="coordinates" name="map" icon="map" :label="`${t('tabs.map')}: ${coordinates}`" />
            </template>
        </VaTabs>
        <VaDivider class="m-0" />
        <VaCardTitle>
            <VaIcon v-if="iconMap[tab]" :name="iconMap[tab].icon" size="small" class="mr-2"
                :color="iconMap[tab].color" />
            {{ t(`tabs.${tab}`) }}
        </VaCardTitle>
        <VaCardContent :key="lineage">
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12 mh-450">
                    <router-view v-if="taxonomyStore.currentTaxon"></router-view>
                </div>
            </div>
        </VaCardContent>
    </VaInnerLoading>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { AxiosError } from 'axios';
import { useToast } from 'vuestic-ui/web-components';
import TaxonService from '../../services/clients/TaxonService'
import { useRouter, useRoute } from 'vue-router'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'
import { TaxonNode } from '../../data/types';
import WikiSummary from './components/WikiSummary.vue';
import Breadcrumbs from './components/Breadcrumbs.vue';
import { iconMap } from '../../composable/useIconMap';


const { t } = useI18n()
const itemStore = useItemStore()
const { init } = useToast()
const taxonomyStore = useTaxonomyStore()
const router = useRouter()
const route = useRoute()
const props = defineProps<{
    lineage: string
}>()



const ancestors = ref<TaxonNode[]>([])
const coordinates = ref(0)

const currentTaxonStats = ref<Record<string, number>>()

const tab = ref('')

const isLoading = ref(false)

watchEffect(async () => {
    await getTaxon(props.lineage)
    await getStats(props.lineage)
    await getCoordinates(props.lineage)
    await getAncestors(props.lineage)
    itemStore.parentTaxon = props.lineage
    setTabs()
    const currentRoute = route.name as string;
    if (currentRoute === 'map') {
        tab.value = 'map';
    } else if (route.params.model) {
        tab.value = route.params.model as string;
    } else {
        tab.value = 'wiki'
    }
})

const validTaxonStats = computed(() => {
    if (currentTaxonStats.value) {
        return Object.entries(currentTaxonStats.value).filter(([k, v]) => v)
    }
    return []
})
onMounted(async () => {
    if (!taxonomyStore.treeData) await taxonomyStore.getTree()
})

const validTabs = ref<{ label: string, name: string, icon?: string, color?: string }[]>([])

function setTabs() {
    const t = []
    if (currentTaxonStats.value) {
        const tabs = Object.entries(currentTaxonStats.value).filter(([k, v]) => v)
            .map(([k, v]) => {
                const { icon } = iconMap[k]
                return { name: k, label: `tabs.${k}`, icon }
            })
        t.push(...tabs)
    }
    validTabs.value = [...t]
}
function updateView(v: string) {
    tab.value = v
    if (!v) return
    if (v === 'wiki') router.push({ name: 'wiki' })
    else if (v === 'map') router.push({ name: 'map' })
    else router.push({ name: 'items', params: { model: v } })
}
async function getStats(taxid: string) {
    currentTaxonStats.value = undefined
    const { data } = await TaxonService.getTaxonStats(taxid)
    currentTaxonStats.value = { ...data }
}

async function getCoordinates(taxid: string) {
    //check if coordinates exists and retrieve the total
    const { data } = await GeoLocationService.getLocations({ lineage: taxid, limit: 2 })
    coordinates.value = data.total
}

async function getTaxon(taxid: string) {
    isLoading.value = true
    try {
        const { data } = await TaxonService.getTaxon(taxid)
        taxonomyStore.currentTaxon = { ...data }
    } catch (error) {
        const axiosError = error as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        isLoading.value = false
    }
}
async function getAncestors(taxid: string) {
    const { data } = await TaxonService.getAncestors(taxid)
    ancestors.value = [...data]
}
</script>
<style scoped>
.ancestors {
    padding: 5px 0 5px 0 !important;
}

.tab-data {
    padding: 5px !important;
}
</style>