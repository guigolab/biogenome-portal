<template>
    <VaSidebar color="backgroundElement" width="20rem" v-model="taxonomyStore.showSidebar">
        <section v-if="selectedTaxon">
            <div style="padding: .75rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div class="va-title">
                        {{ t('taxon.selectedTaxon') || 'Selected Taxon' }}
                    </div>
                    <VaButton icon="fa-chevron-left" preset="secondary" color="secondary" size="small"
                        @click="taxonomyStore.showSidebar = false" title="Hide sidebar" />
                </div>
                <h3 class="va-h3">{{ selectedTaxon.name }}</h3>
                <TaxonSummary :name="selectedTaxon.name" :rank="selectedTaxon.rank" />
            </div>
            <VaDivider style="margin: 0;" />
            <ModelList :taxid="selectedTaxon.taxid" />
            <TaxonomicTree :taxid="selectedTaxon.taxid" />
            <template v-if="isMapRoute">
                <VaCollapse :header="t('taxon.mapCurrentlyViewed')" disabled icon="fa-up-right-from-square" />
            </template>
            <template v-else>
                <VaCollapse v-if="mapStore.hasCoordinates" v-model="isMapExpanded" :header="t('taxon.occurrencesMap')">
                    <div class="map-toggle-row">
                        <VaButtonToggle v-model="mapType" :options="[
                            { label: t('taxon.points') || 'Points', value: 'points', icon: 'fa-location-dot' },
                            { label: t('taxon.heatmap') || 'Heatmap', value: 'heatmap', icon: 'fa-fire' }
                        ]" color="primary" preset="primary" size="small" />
                        <VaButton preset="secondary" :to="{ name: 'map' }" size="small" icon="fa-up-right-from-square">
                        </VaButton>
                    </div>
                    <LeafletHeatmap v-if="mapType === 'heatmap'" :locations="locations" />
                    <LeafletMap v-else :locations="locations" :countries="[]" :selected-countries="[]"
                        :map-type="'points'" />
                </VaCollapse>
            </template>

        </section>
    </VaSidebar>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTaxonomyStore } from '../stores/taxonomy-store'
import TaxonSummary from './TaxonSummary.vue';
import ModelList from './ModelList.vue';
import LeafletHeatmap from './LeafletHeatmap.vue';
import LeafletMap from './LeafletMap.vue';
import { useMapStore } from '../stores/map-store';
import { useI18n } from 'vue-i18n';
import TaxonomicTree from './TaxonomicTree.vue';

const { t } = useI18n()
const taxonomyStore = useTaxonomyStore()
const mapStore = useMapStore()
const selectedTaxon = computed(() => taxonomyStore.currentTaxon)
const isMapExpanded = ref(true)
const mapType = ref<'heatmap' | 'points'>('points')
const route = useRoute()
const isMapRoute = computed(() => route.name === 'map')

watch(() => selectedTaxon.value, async () => {
    if (!selectedTaxon.value) return
    await mapStore.getCoordinates({ taxid: selectedTaxon.value?.taxid })
})

const locations = computed(() => mapStore.locations)
</script>

<style lang="scss" scoped>
.taxonomy-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.taxonomy-navigation {
    flex-shrink: 0;
    background-color: var(--va-background-secondary);
    padding: 1rem 0;
}

.taxonomy-details {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 0;
    scrollbar-width: thin;
    scrollbar-color: var(--va-primary) var(--va-background-primary);

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: var(--va-background-primary);
    }

    &::-webkit-scrollbar-thumb {
        background-color: var(--va-primary);
        border-radius: 3px;
    }
}

.map-toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
}

.selected-taxon-label {
    font-size: 0.95rem;
    color: var(--va-primary);
    font-weight: 600;
    margin-bottom: 0.25rem;
}
</style>