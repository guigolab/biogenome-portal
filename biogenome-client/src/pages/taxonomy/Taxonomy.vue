<template>
    <h1 class="va-h1">{{ t('taxon.title') }}</h1>
    <p class="va-text-secondary" style="margin-bottom: 6px">{{ t('taxon.description') }}</p>
    <VaDivider />
    <div class="row align-end">
        <div class="flex">
            <va-select hideSelected :loading="isLoading" dropdownIcon="search" searchable highlight-matched-text
                :textBy="(v: TreeNode) => `${v.name} (${v.rank})`" trackBy="taxid" @update:model-value="setCurrentTaxon"
                @update:search="taxonomyStore.handleSearch" v-model="taxonomyStore.currentTaxon"
                :searchPlaceholderText="t('taxon.search.placeholder')" :noOptionsText="t('taxon.search.noOptions')"
                :options="taxonomyStore.taxons">
            </va-select>
        </div>
        <div class="flex">
            <VaButton color="primary" :round="false" @click="taxonomyStore.showTree = !taxonomyStore.showTree"
                :loading="taxonomyStore.isTreeLoading">
                {{ taxonomyStore.showTree ? t('taxon.search.hide') : t('taxon.search.show') }}
            </VaButton>
        </div>
        <div class="flex">
            <VaButton color="info" :round="false" @click="router.push({ name: 'taxon', params: { taxid: rootNode } })">
                {{ t('taxon.search.rootLoad') }}
            </VaButton>
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
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { TreeNode } from '../../data/types';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter()
const route = useRoute()
const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'


onMounted(() => {
    if (route.params.taxid) {
        taxonomyStore.taxidQuery = route.params.taxid as string
    }
})

const taxonomyStore = useTaxonomyStore()

const { t } = useI18n()

const isLoading = ref(false)

function setCurrentTaxon(taxon: TreeNode) {
    taxonomyStore.taxons = []
    taxonomyStore.currentTaxon = { ...taxon }
    taxonomyStore.taxidQuery = taxon.taxid
    router.push({ name: 'taxon', params: { taxid: taxon.taxid } })
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
    flex-wrap: nowrap;
    min-width: 0;
    width: 100%;
    flex-direction: row;
}

/* Tree container, initially hidden */
.tree-container {
    flex: 0 0 50%;
    /* Occupies 50% of the width */
    max-width: 50%;
    transition: all 0.5s ease;
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
    transition: all 0.5s ease;
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