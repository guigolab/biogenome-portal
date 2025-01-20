<template>
    <!-- <VaSelect clearable :loading="isLoading" hideSelected dropdownIcon="" searchable highlight-matched-text
        :textBy="(v: TreeNode) => `${v.name} (${v.rank})`" trackBy="taxid" @update:search="debouncedUpdateSearch"
        v-model="taxon" :searchPlaceholderText="'Type here to search..'" :placeholder="t('taxon.search.placeholder')"
        :noOptionsText="taxon === null ? 'Type a taxon' : t('taxon.search.noOptions')" :options="options">
        <template #prependInner>
            <VaIcon name="search" />
        </template>
<template #content="{ value }">
            {{ value.name }}
        </template>
<template #append>
            <VaButton :disabled="disabled" class="ml-2" :loading="taxonomyStore.treeData === null" @click="loadRoot"
                icon="fa-code-branch" color="secondary" preset="primary"></VaButton>
        </template>
</VaSelect> -->
{{ test }}
    <VaSelect :searchPlaceholderText="'Type here to search..'" @update:search="debouncedUpdateSearch" trackBy="taxid"
        :textBy="(v: TreeNode) => `${v.name} (${v.rank})`" v-model:search="test" v-model="taxon"
        placeholder="Type here to search" :options="options" autocomplete highlight-matched-text>
        <template #prependInner>
            <VaIcon name="search" />
        </template>
        <template #content="{ value }">
            {{ value.name }}
        </template>
        <template #append>
            <VaButton :disabled="disabled" class="ml-2" :loading="taxonomyStore.treeData === null" @click="loadRoot"
                icon="fa-code-branch" color="secondary" preset="primary"></VaButton>
        </template>
    </VaSelect>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n'
import { TaxonNode } from '../../data/types';
import TaxonService from '../../services/clients/TaxonService';
import { useItemStore } from '../../stores/items-store';
import GeoLocationService from '../../services/clients/GeoLocationService';
import { useTaxonomyStore } from '../../stores/taxonomy-store';

const taxonomyStore = useTaxonomyStore()
const itemStore = useItemStore()
const isLoading = ref(false)

const disabled = computed(() => itemStore.parentTaxon?.taxid === taxonomyStore.treeData?.taxid)

const test = ref('')
const emits = defineEmits(['taxonUpdate'])

const taxon = computed({
    get() {
        return itemStore.parentTaxon
    }, set(taxon: TaxonNode | null) {
        emits('taxonUpdate', taxon)
        // await itemStore.handleQuery(props.model)
    }
})

function loadRoot() {
    if (!taxonomyStore.treeData) return
    const { taxid, rank, name, leaves } = taxonomyStore.treeData
    taxon.value = { taxid, rank, name, leaves }
}


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

async function getCoordinates(taxid: string) {
    //check if coordinates exists and retrieve the total
    const { data } = await GeoLocationService.getLocations({ lineage: taxid, limit: 2 })
}
async function getStats(taxid: string) {
    const { data } = await TaxonService.getTaxonStats(taxid)
}
</script>
