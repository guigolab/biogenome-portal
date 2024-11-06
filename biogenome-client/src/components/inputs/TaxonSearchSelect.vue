<template>
    <VaSelect :loading="isLoading" hideSelected dropdownIcon="search" searchable highlight-matched-text
        :textBy="(v: TreeNode) => `${v.name} (${v.rank})`" trackBy="taxid" @update:search="debouncedUpdateSearch"
        v-model="taxon" :searchPlaceholderText="'Type here to search..'" :placeholder="t('taxon.search.placeholder')"
        :noOptionsText="t('taxon.search.noOptions')" :options="options">
        <template #content="{ value }">
            <VaChip square> {{ value.name }}
            </VaChip>
        </template>
    </VaSelect>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n'
import { TreeNode } from '../../data/types';
import TaxonService from '../../services/clients/TaxonService';
import { useTaxonomyStore } from '../../stores/taxonomy-store';
import { useRouter } from 'vue-router';

const taxonomyStore = useTaxonomyStore()
const isLoading = ref(false)
const router = useRouter()
const { t } = useI18n()

const taxon = computed({
    get() {
        return taxonomyStore.currentTaxon
    }, set(taxon: TreeNode) {
        router.push({ name: 'wiki', params: { lineage: taxon.taxid } })
    }
})

const options = ref<TreeNode[]>([])

const debouncedUpdateSearch = debounce(async (filter: string) => {
    if (!filter && filter.length <= 1) return
    isLoading.value = true
    try {
        const { data } = await TaxonService.getTaxons({ filter: filter, })
        options.value = [...data.data]
    } catch (error) {
        console.log(error)
    } finally {
        isLoading.value = false
    }
}, 300);

function debounce(fn: any, delay: number) {
    let timeoutId: any;
    return function (...args: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}
</script>
