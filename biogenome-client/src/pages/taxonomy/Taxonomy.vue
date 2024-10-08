<template>
    <h1 class="va-h1">{{ t('taxon.title') }}</h1>
    <p class="va-text-secondary" style="margin-bottom: 6px">{{ t('taxon.description') }}</p>
    <div class="row align-end">
        <div class="flex">
            <VaButton preset="primary" @click="taxonomyStore.showTree = !taxonomyStore.showTree" :loading="taxonomyStore.isTreeLoading">
                {{ taxonomyStore.showTree ? t('taxon.search.hide') : t('taxon.search.show') }}
            </VaButton>
        </div>
        <div class="flex">
            <VaButton :disabled="taxonomyStore.taxidQuery === rootNode" preset="primary"
                @click="router.push({ name: 'wiki', params: { lineage: rootNode } })">
                {{ t('taxon.search.rootLoad') }}
            </VaButton>
        </div>
        <div class="flex lg4 md6 sm12 xs12">
            <TaxonSearchSelect :is-loading="isLoading" :current-taxon="taxonomyStore.currentTaxon"
                @update-taxon="setCurrentTaxon" />
        </div>
    </div>
    <div class="content-row">
        <div :class="['tree-container', { 'hidden': !taxonomyStore.showTree }]">
            <D3HyperTree v-if="taxonomyStore.treeData" @node-change="setCurrentTaxon" />
        </div>
        <div :class="['content-container', { 'full-width': !taxonomyStore.showTree }]">
            <router-view></router-view>
        </div>
    </div>
</template>
<script setup lang="ts">
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { TreeNode } from '../../data/types';
import { useRouter, useRoute } from 'vue-router';
import TaxonSearchSelect from '../../components/inputs/TaxonSearchSelect.vue';

const router = useRouter()
const route = useRoute()
const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'


onMounted(() => {
    if (route.params.lineage) {
        taxonomyStore.taxidQuery = route.params.lineage as string
    }
})

const taxonomyStore = useTaxonomyStore()

const treeDataExists = computed(() => !!taxonomyStore.treeData)

watch(() => treeDataExists.value, () => {
    if (treeDataExists.value) taxonomyStore.showTree = true
})

const { t } = useI18n()

const isLoading = ref(false)

function setCurrentTaxon(taxon: TreeNode) {
    taxonomyStore.currentTaxon = { ...taxon }
    taxonomyStore.taxidQuery = taxon.taxid
    router.push({ name: 'wiki', params: { lineage: taxon.taxid } })
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