<template>
    <div class="content-row">
        <div class="tree-container">
            <D3HyperTree @node-change="setCurrentTaxon" />
        </div>
    </div>
</template>

<script setup lang="ts">
import D3HyperTree from '../../components/D3HyperTree.vue'
import { useI18n } from 'vue-i18n'
import { TaxonNode } from '../../data/types';
import { useTaxonomyStore } from '../../stores/taxonomy-store';
import PageHero from '../../components/PageHero.vue';

const { t } = useI18n()
const taxonomyStore = useTaxonomyStore()

async function setCurrentTaxon(taxon: TaxonNode) {
    taxonomyStore.currentTaxon = { ...taxon }
    taxonomyStore.showSidebar = true
}
</script>

<style lang="scss" scoped>
.content-row {
    display: flex;
    flex-wrap: wrap;
    min-width: 0;
    width: 100%;
    flex-direction: row;
}

/* Tree container, initially hidden */
.tree-container {
    flex: 0 0 66%;
    /* Occupies 50% of the width */
    overflow: hidden;
    margin: auto;
    margin-top: -6rem;
    /* Starts in view */
}

/* Responsive design for mobile and tablets */
@media (max-width: 820px) {
    .tree-container {
        flex: 0 0 100%;
        overflow: hidden;
        margin: auto;
    }
}

@media (max-width: 480px) {
    .tree-container {
        flex: 0 0 100%;
        overflow: hidden;
        margin: auto;
    }
}
</style>