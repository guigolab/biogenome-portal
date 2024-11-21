<template>
    <VaLayout :left="{ fixed: true, absolute: false, order: 2 }" :top="{ fixed: true, order: 1 }">
        <template #top>
            <BreadCrumbBar />
            <TaxonomyHeader />
            <VaDivider style="margin: 0;" />
            <DataTabs />
            <VaDivider style="margin: 0;" />
        </template>
        <template #left>
            <div style="display: flex; height: 100%;">
                <TaxonSidebar style="position: absolute;z-index: 10;" />
                <VaDivider vertical style="margin: 0;" />

            </div>
            <!-- <Sidebar /> -->
        </template>
        <template #content>
            <Table />
            <div class="layout fluid va-gutter-5">
                <router-view v-if="!isLoading" v-slot="{ Component }">
                    <Transition name="fade">
                        <component :is="Component" />
                    </Transition>
                </router-view>
            </div>
        </template>
    </VaLayout>

</template>
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useBreakpoint } from 'vuestic-ui'
import TaxonSidebar from '../components/sidebars/TaxonSidebar.vue';
import DataTabs from '../components/tabs/DataTabs.vue';
import { useItemStore } from '../stores/items-store';
import TaxonService from '../services/clients/TaxonService';
import { useStatsStore } from '../stores/stats-store';
import TaxonomyHeader from '../sections/TaxonomyHeader.vue';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import D3HyperTree from '../components/tree/D3HyperTree.vue';
import { useRouter } from 'vue-router';
import { TaxonNode } from '../data/types';
import Table from '../components/tree/Table.vue';
const itemStore = useItemStore()
const taxonomyStore = useTaxonomyStore()
const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'
const breakpoints = useBreakpoint()
const isLoading = ref(false)
const statsService = useStatsStore()
const props = defineProps<{
    taxid: string | 'root'
}>()

watchEffect(async () => await updateData(props.taxid))

async function updateData(taxid: string) {
    isLoading.value = true
    const isRootNode = taxid === rootNode
    if (isRootNode && taxonomyStore.rootNode) {
        itemStore.parentTaxon = { ...taxonomyStore.rootNode }
    }
    await statsService.getStats(taxid) // taxon stats
    if (taxid === 'root') {
        itemStore.parentTaxon = null
    }
    else if (!itemStore.parentTaxon || taxid !== itemStore.parentTaxon.taxid) {
        const { data } = await TaxonService.getTaxon(props.taxid)
        itemStore.parentTaxon = { ...data }
        if (isRootNode) taxonomyStore.rootNode = { ...data }
    }
    isLoading.value = false
}

const router = useRouter()

async function setCurrentTaxon(taxon: TaxonNode) {
    const { taxid } = taxon
    router.push({ name: 'taxon', params: { taxid } })
}


</script>
<style lang="scss">
/* Tree container, initially hidden */
.tree-container {
    flex: 0 0 66.6%;
    /* Occupies 50% of the width */
    max-width: 66.6%;
    overflow: hidden;
    /* Starts in view */
}


/* Responsive design for mobile and tablets */
@media (max-width: 820px) {

    .tree-container {
        flex: 0 0 100%;
        /* Take 100% of the width on small screens */
        max-width: 100%;
        /* Reset any transform applied */
    }

}

@media (max-width: 480px) {

    .tree-container {
        flex: 0 0 100%;
        /* Take 100% of the width on small screens */
        max-width: 100%;
        transform: translateX(0);

        /* Reset any transform applied */
    }

    .tree-container.hidden {
        display: none;
        /* Hide the tree container completely when toggled off */
    }

}
</style>