<template>
    <div v-if="hasActiveFilters" class="va-text-block">
        <div class="row justify-space-between align-end">
            <div class="flex va-text-bold">
                Applied filters
            </div>
            <div class="flex va-text-bold">
                Showing {{ total }} results
            </div>
        </div>
        <div class="row">
            <div class="flex" v-if="itemStore.parentTaxon">
                <VaChip color="secondary" size="small" square>
                    <div class="row align-center">
                        <div class="flex p-0 ml-2 mr-2">
                            {{ itemStore.parentTaxon?.name }}
                        </div>
                        <div class="flex p-0 mr-2">
                            <VaIcon @click=handleTaxonFilter() name="close" size="small" />
                        </div>
                    </div>
                </VaChip>
            </div>
            <div class="flex" v-if="showCountriesSelect">
                <VaChip color="secondary" flat size="small" square>
                    <div class="row align-center">
                        <div class="flex p-0 ml-2">
                            Country: <span class="ml-2 mr-2 va-text-bold">{{ itemStore.country?.name }} </span>
                        </div>
                        <div class="flex p-0 mr-2">
                            <VaIcon @click=handleCountryFilter() name="close" size="small" />
                        </div>
                    </div>
                </VaChip>
            </div>
            <div v-for="[k, v] in rangeFilters" class="flex">
                <VaChip flat size="small" color="secondary" preset="primary" square>
                    <div class="row align-center">
                        <div class="flex p-0 ml-2" v-if="v.lte">
                            {{ v.lte }}
                            <VaIcon class="ml-2 mr-2" size="small" name="fa-greater-than-equal" />
                        </div>
                        <div class="flex p-0 mr-2">
                            {{ getLabel(k) }}
                        </div>
                        <div class="flex p-0 mr-2" v-if="v.gte">
                            <VaIcon class="mr-2" size="small" name="fa-greater-than-equal" />
                            {{ v.gte }}
                        </div>
                        <div class="flex p-0 mr-2">
                            <VaIcon @click=handleRangeFilter(k) name="close" size="small" />
                        </div>
                    </div>
                </VaChip>
            </div>
            <div v-for="[k, v] in checkBoxFilters" :key="k" class="flex">
                <VaChip flat size="small" color="secondary" preset="primary" square>
                    <div class="row align-center">
                        <div class="flex p-0 ml-2 mr-2">
                            <VaIcon size="small" :name="v ? 'check_circle' : 'cancel'"
                                :color="v ? 'success' : 'danger'" />
                        </div>
                        <div class="flex p-0 mr-2">
                            {{ getLabel(k) }}
                        </div>
                        <div class="flex p-0 mr-2">
                            <VaIcon @click=handleFilter(k) name="close" size="small" />
                        </div>
                    </div>

                </VaChip>
            </div>
            <div v-for="[k, v] in textFilters" :key="k" class="flex">
                <VaChip flat size="small" color="secondary" preset="primary" square>
                    <div class="row align-center">
                        <div class="flex p-0 ml-2">
                            {{ getLabel(k) }}: <span class="ml-2 mr-2 va-text-bold">{{ v }} </span>
                        </div>
                        <div class="flex p-0 mr-2">
                            <VaIcon @click=handleFilter(k) name="close" size="small" />
                        </div>
                    </div>

                </VaChip>
            </div>
        </div>
    </div>

</template>
<script setup lang="ts">

import { computed } from 'vue';
import { useItemStore, staticFilters } from '../../stores/items-store';
import { DataModels } from '../../data/types';
import { useTaxonomyStore } from '../../stores/taxonomy-store';

const staticFiltersKeys = Object.keys(staticFilters)

const props = defineProps<{
    model: DataModels
}>()

const itemStore = useItemStore()
const taxonomyStore = useTaxonomyStore()
const total = computed(() => itemStore.stores[props.model].total)
const activeFilters = computed(() =>
    Object.entries(itemStore.stores[props.model].searchForm)
        .filter(([k, v]) => v !== null && v !== '' && !staticFiltersKeys.includes(k))
);

const showCountriesSelect = computed(() => itemStore.country && props.model === 'organisms')

const hasActiveFilters = computed(() => activeFilters.value.length || itemStore.parentTaxon || showCountriesSelect.value)
const rangeFilters = computed(() => buildRangeQuery(activeFilters.value))
const checkBoxFilters = computed(() => activeFilters.value.filter(([k, v]) => k.endsWith('__exists')))
const textFilters = computed(() => activeFilters.value.filter(([k, v]) => !k.endsWith('__exists') && !k.endsWith('__gte') && !k.endsWith('__lte')))

function buildRangeQuery(filters: [string, any][]) {
    const rangeQuery: Record<string, { gte?: any; lte?: any }> = {};

    // Iterate over the search form entries
    for (const [key, value] of filters) {
        if (key.endsWith('__gte')) {
            const baseKey = key.replace('__gte', '');
            rangeQuery[baseKey] = { ...rangeQuery[baseKey], gte: value };
        } else if (key.endsWith('__lte')) {
            const baseKey = key.replace('__lte', '');
            rangeQuery[baseKey] = { ...rangeQuery[baseKey], lte: value };
        }
    }
    return Object.entries(rangeQuery)
}
function getLabel(key: string) {
    return key.includes('metadata.') ? key.split('.').pop() || key : key.replace(/_/g, ' ');
}

async function handleRangeFilter(key: string) {
    const { searchForm } = itemStore.stores[props.model]
    const gte = `${key}__gte`
    const lte = `${key}__lte`
    if (gte in searchForm) itemStore.setSearchFormField(props.model, gte, null)
    if (lte in searchForm) itemStore.setSearchFormField(props.model, lte, null)
    await itemStore.handleQuery(props.model)
}

async function handleFilter(key: string) {
    itemStore.setSearchFormField(props.model, key, null)
    await itemStore.handleQuery(props.model)
}

async function handleTaxonFilter() {
    itemStore.parentTaxon = null
    await itemStore.handleQuery(props.model)
}

async function handleCountryFilter() {
    itemStore.country = null
    await itemStore.handleQuery(props.model)
}
</script>