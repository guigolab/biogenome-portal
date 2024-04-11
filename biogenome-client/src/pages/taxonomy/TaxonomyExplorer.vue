<template>
    <div class="row align-end">
        <div class="flex">
            <h1 class="va-h1">{{ t('taxonSearch.header') }}</h1>
        </div>
        <div class="flex">
            <va-button color="info" preset="secondary" icon="info"
                href="https://github.com/glouwa/d3-hypertree" target="_blank">
            </va-button>
        </div>
        <div class="flex">
            <va-button color="secondary" preset="secondary" icon="github"
                href="https://github.com/glouwa/d3-hypertree" target="_blank">
            </va-button>
        </div>
    </div>
    <div class="row align-end">
        <va-select hideSelected :loading="isLoading" dropdownIcon="search" searchable
            highlight-matched-text :textBy="(v: TreeNode) => `${v.name} (${v.rank})`" trackBy="taxid"
            :label="t('taxonSearch.label')" @update:model-value="setQuery" @update:search="handleSearch"
            class="flex lg6 md6 sm12 xs12" v-model="taxonomyStore.currentTaxon"
            :searchPlaceholderText="t('taxonSearch.placeholder')" :noOptionsText="t('taxonSearch.noOptions')"
            :options="taxons">
        </va-select>
        <div class="flex">
            <va-button @click="showRelatedTaxonModal = !showRelatedTaxonModal" color="warning" :round="false">
                {{ t("relatedTaxon.button") }}
            </va-button>
        </div>
    </div>
    <VaSplit class="split-demo" :limits="[10, 10]">
        <template #start>
            <div v-if="taxonomyStore.currentTaxon" class="row align-center">
                <div class="flex">
                    <h4 class="va-h4">> {{ taxonomyStore.currentTaxon.name }} ({{ taxonomyStore.currentTaxon.rank }})
                    </h4>
                </div>
                <div class="flex">
                    <VaMenu :options="relatedDataTabs" :textBy="(v: Record<string, any>) => t(v.title)"
                        @selected="(v: Record<string, any>) => relatedDataTab = v.key">
                        <template #anchor>
                            <VaButton preset="primary" :round="false">{{ t('taxonSearch.viewOptions') }}
                            </VaButton>
                        </template>
                    </VaMenu>
                    <!-- <div class="row">
                        <div v-for="tab in relatedDataTabs" class="flex">
                            <va-button size="small" :icon="tab.icon" :key="tab.key" :color="tab.color"
                                :preset="relatedDataTab === tab.key ? 'secondary' : 'primary'"
                                @click="relatedDataTab = tab.key"></va-button>
                        </div>
                    </div> -->
                </div>
            </div>
            <Suspense>
                <template #fallback>
                    <va-skeleton height="100%" />
                </template>
                <D3HyperTree @node-change="setCurrentTaxon" :filter="taxonomyStore.taxidQuery" />
            </Suspense>
        </template>
        <template #grabber>
            <div class="custom-grabber">
                <VaIcon name="swap_horiz" />
            </div>
        </template>
        <template #end>
            <div style="height:100%" v-if="taxonomyStore.currentTaxon">
                <Transition name="slide-bottom">
                    <VaCard v-if="relatedDataTab === 'wiki'">
                        <div class="iframe-wrapper">
                            <iframe :src="src" :key="src"></iframe>
                        </div>
                    </VaCard>
                    <div v-else-if="relatedDataTab === 'map'" style="height:100%;padding: 5px;">
                        <LeafletMap :coordinates="coordinates" />
                    </div>
                    <div v-else-if="relatedDataTab === 'biosamples'">

                    </div>
                    <div v-else-if="relatedDataTab === 'annotations'">

                    </div>
                    <div v-else-if="relatedDataTab === 'assemblies'">

                    </div>
                    <div v-else-if="relatedDataTab === 'experiments'">

                    </div>
                    <div v-else-if="relatedDataTab === 'local_samples'">

                    </div>
                </Transition>
            </div>
        </template>
    </VaSplit>
    <VaModal hide-default-actions overlay-opacity="0.2" v-model="showRelatedTaxonModal">
        <template #header>
            <h4 class="va-h4">{{ t('relatedTaxon.header') }}</h4>
            <p>{{ t('relatedTaxon.description') }}</p>
            <va-divider />
        </template>
        <va-inner-loading :loading="lookupLoading">
            <va-card-content style="padding-left: 0;">
                <va-form tag="form" @submit.prevent="searchRelatedTaxon">
                    <div class="row align-center justify-start">
                        <va-input v-model="taxidLookUp" class="flex lg12 md12 sm12 xs12"
                            :placeholder="t('relatedTaxon.placeholder')" />
                    </div>
                    <va-card-actions align="left">
                        <va-button :disabled="taxidLookUp.length < 0" type="submit">{{ t('buttons.submit')
                            }}</va-button>
                        <va-button color="danger" @click="taxidLookUp = ''">
                            {{ t('buttons.reset') }}
                        </va-button>
                    </va-card-actions>
                </va-form>
            </va-card-content>
        </va-inner-loading>
    </VaModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { wiki } from '../../../config.json'
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
import { SampleLocations, TreeNode } from '../../data/types'
import TaxonService from '../../services/clients/TaxonService'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import TaxonDetailsListBlock from '../taxons/TaxonDetailsListBlock.vue'
import { relatedData } from './configs'

const taxonomyStore = useTaxonomyStore()


const coordinates = ref<SampleLocations[]>([])
const { t, locale } = useI18n()
const wikiMapper = wiki as Record<string, any>
const wikiURL = ref<string>(wikiMapper[locale.value])

const taxons = ref<TreeNode[]>([])
const isLoading = ref(false)
const currentTaxonStats = ref<Record<string, number>>({})
const coordinatesLoading = ref(false)
const statsLoading = ref(false)
const showRelatedTaxonModal = ref(false)

const taxidLookUp = ref('')
const showDetails = ref(false)
const lookupLoading = ref(false)
const relatedDataTab = ref('wiki')

watch(locale, () => {
    wikiURL.value = wikiMapper[locale.value]
})

watch(() => taxonomyStore.currentTaxon, async (v) => {
    if (v && v.taxid) {
        relatedDataTab.value = 'wiki'
        getCoordinates(v.taxid)
        getStats(v.taxid)
    }
})

const src = computed(() => {
    if (taxonomyStore.currentTaxon) return `${wikiURL.value}/${taxonomyStore.currentTaxon.name}`
})

const relatedDataTabs = computed(() => {
    const filteredData = [{ icon: 'wiki', color: 'info', key: 'wiki', title: 'taxonSearch.wiki' }, ...relatedData.filter(d => Object.entries(currentTaxonStats.value).find(([k, v]) => k === d.key && v > 0))]

    if (coordinates.value.length) filteredData.push({ icon: 'fa-map', key: 'map', color: 'success', title: 'taxonSearch.map' })
    return filteredData
})
function setCurrentTaxon(taxon: TreeNode) {
    taxons.value = []
    taxonomyStore.currentTaxon = { ...taxon }
}

function setQuery(taxon: TreeNode) {
    if (taxonomyStore.taxidQuery !== taxon.taxid) taxonomyStore.taxidQuery = taxon.taxid
}

async function handleSearch(v: string) {
    if (v.length < 2) return
    isLoading.value = true
    try {
        const { data } = await TaxonService.getTaxons({ filter: v })
        if (data.data) taxons.value = [...data.data]
    } catch (error) {
        console.log(error)
    } finally {
        isLoading.value = false
    }
}

async function getCoordinates(taxid: string) {
    try {
        coordinatesLoading.value = !coordinatesLoading.value
        const { data } = await GeoLocationService.getLocationsByTaxon(taxid)
        coordinates.value = [...data]
    } catch (error) {
        console.log(error)
        coordinates.value = []
    } finally {
        coordinatesLoading.value = !coordinatesLoading.value
    }
}

async function getStats(taxid: string) {
    try {
        statsLoading.value = !statsLoading.value
        const { data } = await TaxonService.getTaxonStats(taxid)
        currentTaxonStats.value = { ...data }
    } catch (error) {
        console.log('error')
        currentTaxonStats.value = {}
    } finally {
        statsLoading.value = !statsLoading.value
    }
}

async function searchRelatedTaxon() {
    try {
        lookupLoading.value = !lookupLoading.value
        const { data } = await TaxonService.getPhylogeneticallyCloseTree(taxidLookUp.value)
        setCurrentTaxon(data)
        setQuery(data)
    } catch (error) {
        console.log(error)
    } finally {
        showRelatedTaxonModal.value = !showRelatedTaxonModal.value
        lookupLoading.value = !lookupLoading.value
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