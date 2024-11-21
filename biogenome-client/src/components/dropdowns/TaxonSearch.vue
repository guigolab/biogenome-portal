<template>
    <VaDropdown :stick-to-edges="true" v-model="show">
        <template #anchor>
            <VaInput color="primary" placeholder="Search a Taxon" v-model="filter" @update:modelValue="debouncedUpdateSearch">
                <template #prependInner>
                    <VaIcon name="search" />
                </template>
            </VaInput>
        </template>
        <VaDropdownContent>
            <VaMenuList :options="options" :textBy="formatText" trackBy="taxid" @selected="updateTaxon" />
        </VaDropdownContent>
    </VaDropdown>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { TreeNode } from 'vuestic-ui/web-components';
import TaxonService from '../../services/clients/TaxonService';

const show = ref(false)
const emits = defineEmits(['taxonUpdate'])
const options = ref<TreeNode[]>([])

const filter = ref('')


const formatText = (treeNode: TreeNode) => {
    return `${treeNode.name} (${treeNode.rank})`
}
const updateTaxon = (treeNode: TreeNode) => {
    emits('taxonUpdate', treeNode)
    filter.value = ""
    show.value = !show.value
}

const debouncedUpdateSearch = debounce(async (filter: string) => {
    if (!filter && filter.length <= 1) return
    try {
        const { data } = await TaxonService.getTaxons({ filter: filter, })
        options.value = [...data.data]
        show.value = !!options.value.length
    } catch (error) {
        console.log(error)
        show.value = false
    }
}, 400);

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