<template>
    <Button type="button" variant="outlined" :label="parentTaxon ? parentTaxon.name : 'Select a taxon'"
        @click="toggle" />
    <Popover ref="op">
        <div class="flex flex-col gap-4 w-[20rem]">
            <div class="w-full">
                <Fluid>
                    <AutoComplete placeholder="Search a taxon" optionLabel="name" forceSelection @item-select="setTaxon"
                        v-model="selectedTaxon" :suggestions="items" @complete="debouncedUpdateSearch" class="w-full">
                        <template #option="slotProps">
                            <div class="flex items-center">
                                <div>{{ `${slotProps.option.name} (${slotProps.option.rank})` }}</div>
                            </div>
                        </template>
                    </AutoComplete>
                </Fluid>
            </div>
            <div v-if="parentTaxon" class="flex flex-col gap-4 w-full">
                <Divider class="!m-0" />

                <div class="w-full flex justify-between items-center">
                    <h2 class="text-xl font-bold block mb-2">{{ parentTaxon.name }}</h2>
                    <Chip :label="parentTaxon.rank" />
                </div>
                <div class="w-full">
                    <TaxonWikiSummary />
                </div>
                <div class="w-full flex flex-wrap gap-4">
                    <Button v-for="[m, n] in stats" :key="`${m}-${n}`" severity="secondary" variant="outlined"
                        class="h-auto flex flex-col items-center py-2" as="router-link">
                        <!-- <Icon className="h-4 w-4 mb-1" /> -->
                        <span class="text-xs">{{ m }}</span>
                        <span class="font-bold">{{ n }}</span>
                    </Button>
                    <!-- <Button :label="m" :badge="n.toString()" class="w-full" /> -->
                </div>
                <div class="w-full">
                    <Button label="Show in tree" class="w-full" />
                </div>
                <div class="w-full">
                    <Button label="Clear Selection" class="w-full" />
                </div>
            </div>
        </div>

    </Popover>
</template>

<script setup lang="ts">

import { useItemStore } from '../stores/items-store'
import { DataModels, TaxonNode } from '../data/types'
import { computed, ref } from 'vue'
import TaxonService from '../services/TaxonService';
import { AutoCompleteCompleteEvent, AutoCompleteOptionSelectEvent } from 'primevue/autocomplete';
import TaxonWikiSummary from './TaxonWikiSummary.vue';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import pagesConf from '../../configs/pages.json'

const taxonomyStore = useTaxonomyStore()

const pages = Object.keys(pagesConf) as DataModels[]
const stats = computed(() => taxonomyStore.stats.filter(([m, n]) => n > 0 && pages.includes(m)))
const selectedTaxon = ref<TaxonNode | null>(null)
const op = ref();
const itemStore = useItemStore()
const items = ref<TaxonNode[]>([])

const parentTaxon = computed(() => itemStore.parentTaxon)

const toggle = (event: any) => {
    op.value.toggle(event);
}

async function setTaxon(event: AutoCompleteOptionSelectEvent) {
    const { value } = event
    if (value) {
        await taxonomyStore.getStats(value.taxid)
        itemStore.parentTaxon = { ...value }
    } else {
        itemStore.parentTaxon = null
    }
    selectedTaxon.value = null
}



const getTaxons = async (query: Record<string, any>) => {
    try {
        const { data } = await TaxonService.getTaxons(query)
        items.value = [...data.data]
        //get children and expand node in case only one result
    } catch (error) {
        console.log(error)
    }
}

const debouncedUpdateSearch = debounce(async (event: AutoCompleteCompleteEvent) => {
    const { query } = event
    if (!query || !query.trim().length) return
    await getTaxons({ filter: query })
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