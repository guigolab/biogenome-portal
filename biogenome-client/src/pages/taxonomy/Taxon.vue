<template>
    <DetailsSkeleton v-if="isLoading" />
    <div style="padding-left: 15px;" class="row" v-else>
        <div class="flex lg12 md12 sm12 xs12" v-if="currentTaxon">
            <TaxonHeader :taxon="currentTaxon" />
            <VaTabs v-model="tab">
                <template #tabs>
                    <VaTab name="wiki" :label="t('tabs.wiki')"></VaTab>
                    <VaTab :key="index" v-for="(tab, index) in validTabs" :label="t(`tabs.${tab}`)" :name="tab">
                    </VaTab>
                    <VaTab v-if="coordinates.length" :label="t('tabs.map')" name="map"></VaTab>
                </template>
            </VaTabs>
            <VaDivider style="margin-top: 0;" />
            <div v-if="['assemblies', 'organisms', 'experiments', 'biosamples', 'annotations', 'local_samples'].includes(tab)"
                class="row">
                <div :key="tab" class="flex lg12 md12 sm12 xs12">
                    <ItemsBlock :columns="models[(tab as DataModel)].columns"
                        :filters="(models[(tab as DataModel)].filters as Filter[])" :model="(tab as DataModel)" />
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
        <div v-else>
            <VaAlert color="danger" class="mb-6">
                {{ errorMessage || "Something happened" }}
            </VaAlert>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { SampleLocations, TreeNode, DataModel, Filter } from '../../data/types'
import TaxonService from '../../services/clients/TaxonService'
import { models } from '../../../config.json'
import DetailsSkeleton from '../../components/common/DetailsSkeleton.vue'
import TaxonHeader from './components/TaxonHeader.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import ItemsBlock from '../common/components/ItemsBlock.vue'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import { useStore } from '../../composables/use-model'
import { AxiosError } from 'axios'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import Wikipedia from './components/Wikipedia.vue'

const taxonomyStore = useTaxonomyStore()

const coordinates = ref<SampleLocations[]>([])

const errorMessage = ref<string | any>(null)

const props = defineProps<{
    taxid: string
}>()

const isLoading = ref(false)
const currentTaxon = ref<TreeNode>()

const tab = ref('wiki')

watch(() => props.taxid, async (v) => {
    console.log("Watcher")
    if (v) {
        tab.value = 'wiki'
        await getData(v)
    }
})

onMounted(async () => {
    console.log("Mounting")
    await getData(props.taxid)
})

watchEffect(() => {
    setStoreQuery(tab.value)
})

const { t } = useI18n()

const validTabs = computed(() => {
    if (!currentTaxonStats.value) return []
    return Object.entries(currentTaxonStats.value).filter(([k, v]) => v && (!isDataModel(k) || Object.keys(models).includes(k)))
        .map(([k, v]) => k)
})

function isDataModel(str: string): str is DataModel {
    return ['biosamples', 'experiments', 'organisms', 'annotations', 'assemblies', 'local_samples', 'status'].includes(str);
}

const currentTaxonStats = ref<Record<string, number>>()

function setStoreQuery(model: string) {
    if (!isDataModel(model)) return
    const { store } = useStore(model)
    store.searchForm.parent_taxon = currentTaxon.value?.taxid
}

async function getStats(taxid: string) {
    const { data } = await TaxonService.getTaxonStats(taxid)
    currentTaxonStats.value = { ...data }
}

async function getTaxon(taxid: string) {
    const { data } = await TaxonService.getTaxon(taxid)
    currentTaxon.value = { ...data }
    taxonomyStore.currentTaxon = { ...data }
}

async function getCoordinates(taxid: string) {
    const { data } = await GeoLocationService.getLocationsByTaxon(taxid)
    coordinates.value = [...data]
}
async function getData(taxid: string) {
    try {
        isLoading.value = !isLoading.value
        await getTaxon(taxid)
        await getStats(taxid)
        await getCoordinates(taxid)
        taxonomyStore.taxidQuery = ""
        taxonomyStore.taxidQuery = taxid

    } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.code === "404") {
            errorMessage.value = taxid + " Not Found"
        } else {
            errorMessage.value = axiosError.message
        }
    } finally {
        isLoading.value = !isLoading.value
    }
}

</script>

<style lang="scss">
.split-demo {
    height: 100vh;

    & .custom-grabber {
        height: 100%;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--va-background-element);
    }
}

.iframe-wrapper {
    position: relative;
    overflow: visible;
    height: 100vh;
}

.iframe-wrapper iframe {
    width: 100%;
    height: 100%;
}

.slide-bottom-enter-active .inner,
.slide-bottom-leave-active .inner {
    transition: transform .5s ease-out;
}

.slide-bottom-enter-from .inner,
.slide-bottom-leave-to .inner {
    transform: translateY(100%);
}
</style>