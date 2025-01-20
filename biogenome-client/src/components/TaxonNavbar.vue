<template>
    <VaNavbar shadowed style="overflow: scroll; z-index: 5;" bordered>
        <template #left>
            <VaNavbarItem class="navbar-item-slot">
                <p class="va-text-secondary">Selected taxon: </p>
            </VaNavbarItem>
            <VaNavbarItem class="navbar-item-slot">
                <TaxonBreadcrumbs :taxid="taxid" />
                <VaButtonDropdown v-if="leaves > 0" hide-icon label="..." color="background-secondary">
                    <TaxonChildren :taxid="taxid" />
                </VaButtonDropdown>
            </VaNavbarItem>
        </template>
        <template #right>
            <VaNavbarItem class="navbar-item-slot">
                <VaButton @click="taxonomyStore.showSidebar = !taxonomyStore.showSidebar" color="background-secondary">
                    {{ detailsBtn }}</VaButton>
                <VaButton @click="taxonomyStore.resetTaxon" style="margin-left: 5px;" color="background-secondary"
                    icon="fa-close">Clear selection
                </VaButton>
            </VaNavbarItem>
        </template>
    </VaNavbar>
</template>
<script setup lang="ts">
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { computed } from 'vue';
import TaxonBreadcrumbs from './TaxonBreadcrumbs.vue';
import TaxonChildren from './TaxonChildren.vue';


const props = defineProps<{
    taxid: string,
    leaves: number
}>()
const taxonomyStore = useTaxonomyStore()

const detailsBtn = computed(() => taxonomyStore.showSidebar ? 'Hide details' : 'Show details')


</script>