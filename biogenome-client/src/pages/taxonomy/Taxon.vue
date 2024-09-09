<template>
    <VaInnerLoading :style="{ display: taxonomyStore.isContentLoading ? 'inherit' : 'initial' }" :size="50"
        :loading="taxonomyStore.isContentLoading">
        <VaCard>
            <VaCardContent v-if="taxonomyStore.currentTaxon">
                <Header :name="taxonomyStore.currentTaxon.name" />
            </VaCardContent>
            <VaTabs :key="validTabs.length" v-model="tab" @update:model-value="updateView">
                <template #tabs>
                    <VaTab name="wiki" key="wiki">
                        {{ t('tabs.wiki') }}
                    </VaTab>
                    <VaTab :name="validTab.name" v-for="validTab in validTabs" :key="validTab.name">
                        {{ t(validTab.label) }}
                    </VaTab>
                </template>
            </VaTabs>
            <VaDivider style="margin: 0;"></VaDivider>
            <VaCardContent :key="lineage">
                <div class="row">
                    <div style="min-height: 450px;" class="flex lg12 md12 sm12 xs12">
                        <router-view v-if="taxonomyStore.currentTaxon"></router-view>
                    </div>
                </div>
            </VaCardContent>
        </VaCard>
    </VaInnerLoading>
</template>
<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { AxiosError } from 'axios';
import { useToast } from 'vuestic-ui/web-components';
import TaxonService from '../../services/clients/TaxonService'
import Header from './components/Header.vue'
import { useRouter, useRoute } from 'vue-router'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const itemStore = useItemStore()
const { init } = useToast()
const taxonomyStore = useTaxonomyStore()
const router = useRouter()
const route = useRoute()
const props = defineProps<{
    lineage: string
}>()

const coordinates = ref(0)

const currentTaxonStats = ref<Record<string, number>>()

const tab = ref('')

const isLoading = ref(false)

watchEffect(async () => {
    await getTaxon(props.lineage)
    await getStats(props.lineage)
    await getCoordinates(props.lineage)
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


onMounted(async () => {
    if (!taxonomyStore.treeData) await taxonomyStore.getTree()
})

const validTabs = ref<{ label: string, name: string }[]>([])

function setTabs() {
    const t = []
    if (currentTaxonStats.value) {
        const tabs = Object.entries(currentTaxonStats.value).filter(([k, v]) => v)
            .map(([k, v]) => { return { name: k, label: `tabs.${k}` } })
        t.push(...tabs)
    }
    if (coordinates.value) t.push({ name: 'map', label: 'tabs.map' })
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