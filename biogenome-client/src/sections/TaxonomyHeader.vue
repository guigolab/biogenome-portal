<template>
    <section class="layout fluid va-gutter-5 bg-primary">
        <div class="row justify-space-between align-center">
            <div class="flex">
                <div class="row align-center">
                    <div class="flex">

                        <D3HyperTree @node-change="setCurrentTaxon" />
                    </div>
                    <div class="flex">
                        <h1 class="va-h1">{{ title }} </h1>
                    </div>
                    <div v-if="parentTaxon" class="flex">
                        <VaChip size="small" outline color="secondary">{{ parentTaxon.rank }}</VaChip>
                    </div>
                </div>
            </div>
            <div class="flex">
                <div class="row">
                    <div class="flex">
                        <VaButton :to="{ name: 'taxon', params: { taxid: rootNode } }" preset="primary">View Eukaryota
                        </VaButton>
                    </div>
                    <div class="flex">
                        <VaButton @click="taxonomyStore.showTree = !taxonomyStore.showTree" preset="primary"
                            color="secondary">Explore Tree</VaButton>
                    </div>
                    <div v-if="itemStore.parentTaxon" class="flex">
                        <VaButton @click="router.push({ name: 'taxon', params: { taxid: 'root' } })" preset="secondary"
                            color="secondary" icon="clear">Clear selection
                        </VaButton>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useItemStore } from '../stores/items-store';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { useRouter } from 'vue-router';
import D3HyperTree from '../components/tree/D3HyperTree.vue';
import { TaxonNode } from '../data/types';


const router = useRouter()
const taxonomyStore = useTaxonomyStore()
const itemStore = useItemStore()
const parentTaxon = computed(() => itemStore.parentTaxon)

const rootNode = import.meta.env.VITE_ROOT_NODE ?
    import.meta.env.VITE_ROOT_NODE : '131567'

const title = computed(() => itemStore.parentTaxon ? itemStore.parentTaxon.name : 'All Data')



async function setCurrentTaxon(taxon: TaxonNode) {
    const { taxid } = taxon
    router.push({ name: 'taxon', params: { taxid } })
}
</script>
<style scoped>
.bg-primary {
    background-color: var(--va-background-primary);
}
</style>
