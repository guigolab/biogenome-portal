<template>
    <VaCollapse header="Filter by Taxonomy">
        <p>Select a taxon to filter data by specific taxonomic groups, such as Mammals or Birds.</p>
        <div class="row align-end justify-space-between mb-6">
            <div class="flex lg12 md12 sm12 xs12">
                <TaxonSearchSelect @taxon-update="updateTaxon" />
            </div>
        </div>
        <div class="row align-center justify-space-between">
            <div class="flex">
                {{ taxonomyStore.showTree ? 'Hide' : 'Show' }} Tree
            </div>
            <div class="flex">
                <VaSwitch size="small" v-model="taxonomyStore.showTree"></VaSwitch>
            </div>
        </div>
    </VaCollapse>
</template>
<script setup lang="ts">
import { DataModels, TaxonNode } from '../../data/types';
import TaxonSearchSelect from '../inputs/TaxonSearchSelect.vue';
import { useItemStore } from '../../stores/items-store';
import { useTaxonomyStore } from '../../stores/taxonomy-store';

const props = defineProps<{
    model: DataModels
}>()

const itemStore = useItemStore()
const taxonomyStore = useTaxonomyStore()

async function updateTaxon(taxon: TaxonNode | null) {
    if (taxon) {
        await taxonomyStore.getStats(taxon.taxid)
    }
    itemStore.parentTaxon = taxon
    await itemStore.handleQuery(props.model)
}


</script>