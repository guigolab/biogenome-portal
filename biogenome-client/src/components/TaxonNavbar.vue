<template>
    <VaNavbar shadowed style="overflow: scroll; z-index: 5;" bordered>
        <template #left>
            <VaNavbarItem class="navbar-item-slot">
                <p class="va-text-secondary">{{ t('taxon.chip') }} </p>
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
                    {{ t(detailsBtn) }}</VaButton>
                <VaButton @click="taxonomyStore.resetTaxon" style="margin-left: 5px;" color="background-secondary"
                    icon="fa-close">{{ t('taxon.clearBtn') }}
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

const {t} = useI18n()
const props = defineProps<{
    taxid: string,
    leaves: number
}>()
const taxonomyStore = useTaxonomyStore()

const detailsBtn = computed(() => taxonomyStore.showSidebar ? 'taxon.hideDetails' : 'taxon.showDetails')


</script>