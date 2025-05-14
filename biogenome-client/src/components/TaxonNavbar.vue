<template>
    <VaNavbar shadowed style="overflow: scroll; z-index: 5;" bordered>
        <template #left>
            <VaNavbarItem>
                <TaxonSearch />
            </VaNavbarItem>
        </template>
        <template v-if="taxid" #right>
            <VaNavbarItem class="navbar-item-slot">
                <p class="va-text-secondary">{{ t('taxon.chip') }} </p>
            </VaNavbarItem>
            <VaNavbarItem class="navbar-item-slot">
                <TaxonBreadcrumbs :taxid="taxid" />
                <VaButtonDropdown preset="secondary" v-if="leaves" hide-icon label="..." color="textPrimary">
                    <TaxonChildren :taxid="taxid" />
                </VaButtonDropdown>
            </VaNavbarItem>
            <VaNavbarItem class="navbar-item-slot">
                <VaButton @click="taxonomyStore.showSidebar = !taxonomyStore.showSidebar" preset="primary"
                    color="textPrimary">
                    {{ t(detailsBtn) }}</VaButton>
                <VaButton @click="taxonomyStore.resetTaxon" style="margin-left: 5px;" preset="secondary"
                    color="textPrimary" icon="fa-close">
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
import { useI18n } from 'vue-i18n';
import TaxonSearch from './TaxonSearch.vue';

const { t } = useI18n()
const props = defineProps<{
    taxid?: string,
    leaves?: number
}>()
const taxonomyStore = useTaxonomyStore()

const detailsBtn = computed(() => taxonomyStore.showSidebar ? 'taxon.hideDetails' : 'taxon.showDetails')


</script>