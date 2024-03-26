<template>
    <div class="row">
        <div class="flex lg10 md10 sm12 xs12">
            <div class="row align-center">
                <div class="flex lg10 md10" style="padding: 0;">
                    <h1 class="va-h1">Hyperbolic Tree of Life</h1>
                    <p class="mb-2">A Hyperbolic browser is an interactive "tree" visualization, similar to a map
                        application. The "tree" can be explored by panning. Pinch gestures and mouse wheel can be used
                        to focus in and out.

                        Unfortunately the entire dataset can not be rendered yet, hence it is split in branches, each
                        containing up to 50 000 species. Click on a branch of the "tree" on the right, to open such a
                        branch and browse its species</p>
                </div>
            </div>
        </div>
    </div>
    <div class="row align-end">
        <va-select preset="bordered" :loading="isLoading" dropdownIcon="search" searchable highlight-matched-text
            :textBy="(v: TreeNode) => `${v.name} (${v.rank})`" trackBy="taxid" :label="t('Current taxon')"
            @update:model-value="setQuery" @update:search="handleSearch" class="flex lg6 md6 sm12 xs12"
            v-model="taxonomyStore.currentTaxon" :searchPlaceholderText="t('Type a taxon name or a taxon identifier')"
            :noOptionsText="t('No taxons found')" :options="taxons">
            <template #content="{ value }">
                <b v-if="value">{{ value.name }} ({{ value.rank }})</b>
            </template>
            <!-- <template #append>
                <div class="row">
                    <div class="flex">
                        <VaBadge color="info" overlap :text="taxonomyStore.currentTaxon.leaves">
                            <VaButton @click="showOrganisms = !showOrganisms" color="secondary" icon="fa-paw">
                                Organisms
                            </VaButton>
                        </VaBadge>
                    </div>
                    <div v-if="coordinates.length" class="flex">
                        <va-button @click="showMap = !showMap" color="success" icon="fa-map">Samples Map</va-button>
                    </div>
                </div>
            </template> -->
        </va-select>
        <div v-if="taxonomyStore.currentTaxon" class="flex">
            <VaMenu>
                <template #anchor>
                    <VaButton color="info" :round="false">Related Data</VaButton>
                </template>
                <VaMenuItem @selected="showOrganisms = !showOrganisms">
                    <template #left-icon>
                        <VaIcon name="fa-paw" />
                    </template>
                    Related Organisms ({{ taxonomyStore.currentTaxon.leaves }})
                </VaMenuItem>
                <VaMenuItem @selected="showMap = !showMap" v-if="coordinates">
                    <template #left-icon>
                        <VaIcon name="fa-map" />
                    </template>
                    Related Samples Coordinates
                </VaMenuItem>
            </VaMenu>
        </div>

        <!-- <div v-if="taxonomyStore.currentTaxon" class="flex">
            <div class="row">
                <div class="flex">
                    <VaBadge color="info" overlap :text="taxonomyStore.currentTaxon.leaves">
                        <VaButton @click="showOrganisms = !showOrganisms" color="secondary" icon="fa-paw">
                            Organisms
                        </VaButton>
                    </VaBadge>
                </div>
                <div v-if="coordinates.length" class="flex">
                    <va-button @click="showMap = !showMap" color="success" icon="fa-map">Samples Map</va-button>
                </div>
            </div>
        </div> -->
    </div>
    <va-divider></va-divider>
    <VaSplit class="split-demo" :limits="[10, 10]">
        <template #start>
            <Suspense>
                <template #fallback>
                    <va-skeleton height="100vh" />
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
            <VaCard v-if="taxonomyStore.currentTaxon">
                <div class="iframe-wrapper">
                    <iframe :src="src" :key="src"></iframe>
                </div>
            </VaCard>
        </template>
    </VaSplit>
    <VaModal v-model="showMap">
        <div>
            <p> Coordinates of {{ taxonomyStore.currentTaxon?.name }}'s related samples</p>
            <va-divider>
            </va-divider>
            <div style="height: 450px">
                <LeafletMap :coordinates="coordinates"></LeafletMap>

            </div>

        </div>
    </VaModal>
    <VaModal v-model="showOrganisms">
        <div style="height: 450px">
            <p> {{ taxonomyStore.currentTaxon?.name }}'s related organisms</p>
            <va-divider>
            </va-divider>
            <div v-if="taxonomyStore.currentTaxon" style="height: 450px">
                <TaxonDetailsListBlock :taxid="taxonomyStore.currentTaxon.taxid" />

            </div>
        </div>
    </VaModal>

</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { wiki } from '../../../config.json'
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
import { SampleLocations, TreeNode } from '../../data/types'
import SideBar from './components/SideBar.vue'
import TaxonService from '../../services/clients/TaxonService'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import TaxonDetailsListBlock from '../taxons/TaxonDetailsListBlock.vue'


const taxonomyStore = useTaxonomyStore()

const coordinates = ref<SampleLocations[]>([])
const { t, locale } = useI18n()
const wikiMapper = wiki as Record<string, any>
const wikiURL = ref<string>(wikiMapper[locale.value])
// const src = ref('')
const showMap = ref(false)
const showOrganisms = ref(false)
const taxons = ref<TreeNode[]>([])
const isLoading = ref(false)
watch(locale, () => {
    wikiURL.value = wikiMapper[locale.value]
})

watch(() => taxonomyStore.currentTaxon, async (v) => {
    if (v && v.taxid) {
        const { data } = await GeoLocationService.getLocationsByTaxon(v.taxid)
        coordinates.value = [...data]
    }
})

const src = computed(() => {
    if (taxonomyStore.currentTaxon) return `${wikiURL.value}/${taxonomyStore.currentTaxon.name}`
})

function setCurrentTaxon(taxon: TreeNode) {
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


</script>
<style lang="scss">
.split-demo {
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
</style>
