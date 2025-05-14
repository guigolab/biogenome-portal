<template>
    <VaDropdown placement="bottom-start" v-model="show" :closeOnContentClick="false" stickToEdges
        verticalScrollOnOverflow>
        <template #anchor>
            <VaInput class="taxon-input-width" clearable v-model="filter" @update:model-value="debouncedUpdateSearch"
                :loading="isLoading" :placeholder="t('taxon.searchPlaceholder')">
                <template #prependInner>
                    <VaIcon name="fa-magnifying-glass" />
                </template>
            </VaInput>
        </template>
        <VaDropdownContent>
            <VaMenuList style="min-width: 100%!important;" v-if="taxons.length" :track-by="'taxid'"
                :text-by="({ name, rank }: TaxonNode) => `${name} (${rank})`" :options="taxons"
                @selected="updateTaxon" />
            <p v-else>{{ t('taxon.noTaxons') }} {{ filter }}</p>
        </VaDropdownContent>
    </VaDropdown>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { TaxonNode } from '../data/types';
import TaxonService from '../services/TaxonService';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const taxons = ref<TaxonNode[]>([])
const filter = ref()
const isLoading = ref(false)
const show = ref(false)

const taxonomyStore = useTaxonomyStore()
watch(() => filter.value, () => {
    if (!filter.value) show.value = false
})

function debounce(fn: any, delay: number) {
    let timeoutId: any;
    return function (...args: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}
const debouncedUpdateSearch = debounce(async (filter: string) => {
    if (!filter && filter.length <= 1) return
    isLoading.value = true
    try {
        const { data } = await TaxonService.getTaxons({ filter: filter, })
        taxons.value = [...data.data]
        show.value = true
    } catch (error) {
        console.log(error)
    } finally {
        isLoading.value = false
    }
}, 500);

async function updateTaxon(taxon: TaxonNode) {
    taxonomyStore.currentTaxon = { ...taxon }
    taxonomyStore.showSidebar = true
    filter.value = ''
}

</script>
<style scoped>
.taxon-input-width {
    min-width: 300px;
    overflow: hidden;
}
</style>