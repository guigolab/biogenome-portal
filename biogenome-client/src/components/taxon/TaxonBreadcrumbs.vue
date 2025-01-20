<template>
    <VaBreadcrumbs color="primary" separator=">">
        <VaBreadcrumbsItem style="cursor: pointer;" @click="fetchTaxon(taxid)" v-for="({ name, taxid }) in ancestors" :label="name">
        </VaBreadcrumbsItem>
        <VaBreadcrumbsItem>
            <!-- <VaButton color="textPrimary" preset="secondary">{{ taxonomyStore.currentTaxon?.name }}</VaButton> -->
            <span class="va-text-bold">{{ taxonomyStore.currentTaxon?.name }}</span>
        </VaBreadcrumbsItem>
        <!-- <VaBreadcrumbsItem style="cursor: pointer;" v-if="children.length">...</VaBreadcrumbsItem> -->
    </VaBreadcrumbs>
</template>
<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useTaxonomyStore } from '../../stores/taxonomy-store';

const props = defineProps<{
    taxid: string
}>()

const taxonomyStore = useTaxonomyStore()
const ancestors = computed(() => taxonomyStore.ancestors.slice(-3, -1))

watchEffect(async () => {
    await taxonomyStore.getAncestors(props.taxid)
})

async function fetchTaxon(taxid: string) {
    await taxonomyStore.fetchTaxon(taxid)
}
</script>
<style scoped>
.scrollable-container {
    display: flex;
    overflow-x: auto;
    width: 100%;
    white-space: nowrap;
    padding: 5px 0;
    /* Optional: adds some space around the scrollable area */
}

.breadcrumb-item {
    display: inline-flex;
    align-items: center;
    margin-right: 8px;
    /* Optional: spacing between items */
}
</style>