<template>
    <VaSelect @click="emits('inputClicked')" :loading="isLoading" hideSelected dropdownIcon="search" searchable
        highlight-matched-text :textBy="(v: TreeNode) => `${v.name} (${v.rank})`" trackBy="taxid"
        @update:search="debouncedUpdateSearch" v-model="taxon" :searchPlaceholderText="t('taxon.search.placeholder')"
        :placeholder="t('taxon.search.placeholder')" :noOptionsText="t('taxon.search.noOptions')" :options="options">
    </VaSelect>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n'
import { TreeNode } from '../../data/types';
import TaxonService from '../../services/clients/TaxonService';
import { AxiosError } from 'axios';

const props = defineProps<{
    currentTaxon: TreeNode | null,
    isLoading?: boolean
}>()

const emits = defineEmits(['updateTaxon', 'inputClicked'])

const { t } = useI18n()
const taxon = computed({
    get() {
        return props.currentTaxon
    }, set(taxon: TreeNode) {
        emits('updateTaxon', taxon)
    }
})

const options = ref<TreeNode[]>([])

const debouncedUpdateSearch = debounce(async (filter: string) => {
    if (!filter && filter.length <= 1) return
    try {
        const { data } = await TaxonService.getTaxons({ filter: filter })
        options.value = [...data.data]
    } catch (error) {
        console.log(error)
        const axiosError = error as AxiosError
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