<template>
    <VaSidebar width="20rem" v-model="taxonomyStore.showSidebar">
        <section v-if="selectedTaxon" class="layout va-gutter-5 fluid">
            <h3 class="va-h3">{{ selectedTaxon.name }}</h3>
            <TaxonSummary :name="selectedTaxon.name" :rank="selectedTaxon.rank" />
            <VaDivider />
            <div class="row">
                <div class="flex">
                    <h4 class="va-h6">
                        {{ t('taxon.relatedData') }}
                    </h4>
                </div>
            </div>
            <ModelList :taxid="selectedTaxon.taxid" />
            <VaDivider />
            <div v-if="mapStore.hasCoordinates">
                <div class="row justify-space-between align-center">
                    <div class="flex">
                        <h4 class="va-h6">
                            {{ t('taxon.occurrencesMap') }}
                        </h4>
                    </div>
                    <div class="flex">
                        <VaButton preset="primary" :to="{ name: 'map' }" size="small" color="textPrimary">View
                        </VaButton>

                    </div>
                </div>

                <LeafletMap :locations="locations" :countries="[]" :selected-countries="[]" :map-type="'points'" />
            </div>
        </section>
    </VaSidebar>
</template>
<script setup lang="ts">

import { computed, watch } from 'vue';
import { useTaxonomyStore } from '../stores/taxonomy-store'
import TaxonSummary from './TaxonSummary.vue';
import ModelList from './ModelList.vue';
import LeafletMap from './LeafletMap.vue';
import { useMapStore } from '../stores/map-store';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const taxonomyStore = useTaxonomyStore()
const mapStore = useMapStore()
const selectedTaxon = computed(() => taxonomyStore.currentTaxon)

watch(() => selectedTaxon.value, async () => {
    if (!selectedTaxon.value) return
    await mapStore.getCoordinates({ taxid: selectedTaxon.value?.taxid })
})

const locations = computed(() => mapStore.locations)

</script>
<style>
.va-collapse__header,
.va-collapse__content {
    padding-left: 0 !important;
    padding-right: 0 !important;
}
</style>