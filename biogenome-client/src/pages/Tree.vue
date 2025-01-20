<template>
    <div class="row justify-center">
        <div style="text-align: center;" class="flex lg12 md12 sm12 xs12">
            <h2 class="va-h2 mt-0">{{ t('taxon.title') }}</h2>
            <p class="light-paragraph">
                {{ t('taxon.description') }}
            </p>
        </div>
    </div>
    <div class="content-row">
        <div :class="['tree-container']">
            <D3HyperTree @node-change="setCurrentTaxon" />
        </div>
    </div>
</template>
<script setup lang="ts">
import D3HyperTree from '../components/tree/D3HyperTree.vue'
import { useI18n } from 'vue-i18n'
import { TaxonNode } from '../data/types';
import { useRouter } from 'vue-router';
import { useItemStore } from '../stores/items-store';

const { t } = useI18n()
const itemsStore = useItemStore()
const router = useRouter()
async function setCurrentTaxon(taxon: TaxonNode) {
    const { taxid } = taxon

    router.push({ name: 'tree', params: { taxid } })
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
    max-width: 66.6%;
    overflow: hidden;
    margin: auto;
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
        /* Reset any transform applied */
    }


}
</style>