<template>
    <div class="row">
        <div class="flex">
            <h1 class="va-h1">{{ t('taxon.title') }}</h1>
            <p class="light-paragraph mb-6">{{ t('taxon.description') }}</p>
        </div>
    </div>
    <div class="row align-end">
        <div class="flex">
            <TaxonSearchSelect />
        </div>
        <div class="flex">
            <VaButton preset="primary" :icon="taxonomyStore.showTree ? 'visibility_off' : 'visibility'"
                color="secondary" @click="taxonomyStore.showTree = !taxonomyStore.showTree"
                :loading="taxonomyStore.isTreeLoading">
                {{ taxonomyStore.showTree ? t('taxon.search.hide') : t('taxon.search.show') }}
            </VaButton>
        </div>
    </div>
    <D3HyperTree @update-ancestors="updateAncestors" v-if="taxonomyStore.treeData" @node-change="setCurrentTaxon" />
</template>
<script setup lang="ts">
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { TaxonNode } from '../../data/types';
import { useRouter, useRoute } from 'vue-router';
import TaxonSearchSelect from '../../components/inputs/TaxonSearchSelect.vue';
import Breadcrumbs from './components/Breadcrumbs.vue'

const router = useRouter()
const route = useRoute()
const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'
const { t } = useI18n()

const isLoading = ref(false)
const notFound = ref(false)

const ancestors = ref<TaxonNode[]>([])

const taxonomyStore = useTaxonomyStore()

watch(() => taxonomyStore.currentTaxon, () => {
    if (taxonomyStore.currentTaxon) notFound.value = false
})


watch(() => taxonomyStore.isOutOfBoundaries, () => {
    if (taxonomyStore.isOutOfBoundaries) {
        taxonomyStore.init({ message: `${taxonomyStore.currentTaxon?.name} is not under ${taxonomyStore.treeData?.name}`, color: 'warning' })
        taxonomyStore.showTree = false
    }
})

function setCurrentTaxon(taxon: TaxonNode) {
    taxonomyStore.currentTaxon = { ...taxon }
    notFound.value = false
    router.push({ name: 'wiki', params: { lineage: taxon.taxid } })
}

function updateAncestors(ancs: TaxonNode[]) {
    ancestors.value = [...ancs]
}
</script>

<style lang="scss">
.iframe-wrapper {
    position: relative;
    overflow: visible;
    height: 100vh;
}

.iframe-wrapper iframe {
    width: 100%;
    height: 100%;
}

.content-row {
    display: flex;
    flex-wrap: wrap;
    min-width: 0;
    width: 100%;
    flex-direction: row;
}

/* Tree container, initially hidden */
.tree-container {
    flex: 0 0 50%;
    /* Occupies 50% of the width */
    max-width: 50%;
    transition: all 0.7s ease;
    overflow: hidden;
    transform: translateX(0);
    /* Starts in view */
}

.tree-container.hidden {
    flex: 0 0 0%;
    /* Shrinks to 0% width */
    max-width: 0;
    transform: translateX(-100%);
    /* Slides out of view */
}

/* Content container transitions smoothly */
.content-container {
    flex: 1;
    max-width: 50%;
    /* Occupies remaining space */
    transition: all 0.7s ease;
}

.content-container.full-width {
    flex: 1 1 100%;
    /* Takes full width when tree is hidden */
    max-width: 100%;
}

/* Responsive design for mobile and tablets */
@media (max-width: 820px) {

    .tree-container,
    .content-container {
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

@media (max-width: 480px) {

    .tree-container,
    .content-container {
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