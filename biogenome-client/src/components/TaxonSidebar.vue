<template>
    <VaSidebar width="20rem" v-model="taxonomyStore.showSidebar">
        <section v-if="selectedTaxon" class="layout va-gutter-5 fluid">
            <!-- <TaxonBreadcrumbs :taxid="selectedTaxon.taxid" /> -->

            <h3 class="va-h3">{{ selectedTaxon.name }}</h3>
            <TaxonSummary :name="selectedTaxon.name" :rank="selectedTaxon.rank" />
            <VaDivider />
            <div class="row">
                <div class="flex">
                    <h4 class="va-h6">
                        Related Data
                    </h4>
                </div>
            </div>
            <ModelList :taxid="selectedTaxon.taxid" />
            <div class="row align-center justify-space-between">
                <div class="flex">
                    <h4 class="va-h6">
                        Occurrences Map
                    </h4>
                </div>
                <div class="flex">
                    <VaIcon name="fa-expand" />
                </div>
            </div>
            <LeafletMap :taxid="selectedTaxon.taxid" />

        </section>
    </VaSidebar>
</template>
<script setup lang="ts">

import { computed } from 'vue';
import { useTaxonomyStore } from '../stores/taxonomy-store'
import TaxonSummary from './TaxonSummary.vue';
import ModelList from './ModelList.vue';
import LeafletMap from './LeafletMap.vue';

const taxonomyStore = useTaxonomyStore()

const selectedTaxon = computed(() => taxonomyStore.currentTaxon)





</script>
<style>
.va-collapse__header,
.va-collapse__content {
    padding-left: 0 !important;
    padding-right: 0 !important;
}
</style>