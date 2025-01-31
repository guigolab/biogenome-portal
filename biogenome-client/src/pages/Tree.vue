<template>
    <div>
        <div class="row justify-center">
            <div style="text-align: center;" class="flex">
                <Header title-class="va-h1" description-class="va-text-secondary" :title="t('taxon.title')"
                    :description="t('taxon.description')" />
            </div>
        </div>
        <div style="position: relative;" class="row justify-center">
            <div style="position: absolute;width: max(300px, 50%)" class="flex">
                <VaCard>
                    <VaCardContent>
                        <TaxonSearch />
                    </VaCardContent>
                </VaCard>
            </div>
        </div>
        <div class="content-row">
            <div class="tree-container">
                <D3HyperTree @node-change="setCurrentTaxon" />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import D3HyperTree from '../components/D3HyperTree.vue'
import { useI18n } from 'vue-i18n'
import { TaxonNode } from '../data/types';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import Header from '../components/Header.vue';
import TaxonSearch from '../components/TaxonSearch.vue';

const { t } = useI18n()
const taxonomyStore = useTaxonomyStore()

async function setCurrentTaxon(taxon: TaxonNode) {
    taxonomyStore.currentTaxon = { ...taxon }
    taxonomyStore.showSidebar = true
}

</script>
<style lang="scss">
.content-row {
    display: flex;
    flex-wrap: wrap;
    min-width: 0;
    width: 100%;
    flex-direction: row;
}

/* Tree container, initially hidden */
.tree-container {
    flex: 0 0 66.6%;
    /* Occupies 50% of the width */
    overflow: hidden;
    margin: auto;
    /* Starts in view */
}

/* Responsive design for mobile and tablets */
@media (max-width: 820px) {

    .tree-container {
        flex: 0 0 100%;
        overflow: hidden;
        margin: auto;
        /* Take 100% of the width on small screens */
        /* Reset any transform applied */
    }
}

@media (max-width: 480px) {

    .tree-container {
        flex: 0 0 100%;
        overflow: hidden;
        margin: auto;
        /* Reset any transform applied */
    }


}
</style>