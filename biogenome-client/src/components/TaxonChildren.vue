<template>
    <VaMenuList @selected="setTaxon" track-by="taxid" :text-by="({ name, rank }: TaxonNode) => `${name} (${rank})`"
        style="min-width: 100%!important;" :options="children">
    </VaMenuList>
</template>
<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { TaxonNode } from '../data/types';

const props = defineProps<{
    taxid: string,
}>()

const taxonomyStore = useTaxonomyStore()

watchEffect(async () => {
    await taxonomyStore.getChildren(props.taxid)
})


const children = computed(() => taxonomyStore.children)


function setTaxon(taxon: TaxonNode) {
    taxonomyStore.currentTaxon = { ...taxon }
}

</script>