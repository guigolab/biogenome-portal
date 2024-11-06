<template>
    <h3>Filters</h3>
    <p>Filters apply to both table and chart views</p>
    <div class="row align-end">
        <div class="flex" v-for="(field, index) in currentFilters" :key="index">
            <component :is="getFieldComponent(field.type)" :value="getValue(field)" :label="getLabel(field.key)"
                :options="currentFrequencies[field.key]" :key="field.key" class="m-2"
                @valueChange="(v: any) => updateSearchForm(field, v)">
            </component>
        </div>
    </div>

    <div v-if="showEBPMetrics">
        <VaDivider orientation="left" class="mb-12">EBP metrics</VaDivider>
        <div class="row">
            <div class="flex">
                <VaCheckbox indeterminate :label="'Contig N50 > 1MB'" v-model="ebpFilter.contig" />
            </div>
            <div class="flex">
                <VaCheckbox indeterminate :label="'Scaffold N50 > 10MB'" v-model="ebpFilter.scaffold" />
            </div>
        </div>
    </div>

    <div class="row">
        <div class="flex">
            <VaButton :disabled="!activeFilters" @click="resetSearchForm" color="danger">
                Reset
                all
            </VaButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useItemStore } from '../../stores/items-store';
import general from '../../../configs/general.json';
import Input from '../inputs/Input.vue'
import Select from '../inputs/Select.vue'
import DateInput from '../inputs/DateRange.vue'
import CheckBox from '../inputs/CheckBox.vue'
import { useDateMapper } from '../../composable/useDates'
import { ConfigFilter, DataModels } from '../../data/types';
import { useConfig } from '../../composable/useConfig';

const props = defineProps<{
    model: DataModels
}>()

const itemStore = useItemStore();
const ebpRelated = Boolean(general.ebp_related)
const showEBPMetrics = computed(() => props.model === 'assemblies' && ebpRelated)
const searchForm = computed(() => itemStore.stores[props.model].searchForm)
const dateModels = computed(() => useDateMapper(searchForm.value));
const currentFilters = ref<ConfigFilter[]>([]);

const currentFrequencies = computed(() => {
    const mappedFreqs = itemStore.frequencies
        .filter(f => f.model === props.model && f.source === props.model)
        .map(f => {
            return [f.field, f.data]
        })
    return Object.fromEntries(mappedFreqs)
})

// Optimized activeFilters computation
const activeFilters = computed(() =>
    Object.values(itemStore.stores[props.model].searchForm).some(v => v !== null && v !== '')
);

const ebpFilter = reactive({
    contig: getN50('metadata.assembly_stats.contig_n50'),
    scaffold: getN50('metadata.assembly_stats.scaffold_n50')
})

// Get N50 threshold value
function getN50(field: string) {
    const value = itemStore.stores[props.model].searchForm[`${field}__gt`] ? true
        : itemStore.stores[props.model].searchForm[`${field}__lt`] ? false
            : null;
    return value;
}


watch(ebpFilter, async () => {
    const {
        'metadata.assembly_stats.contig_n50__gt': _,
        'metadata.assembly_stats.scaffold_n50__gt': __,
        'metadata.assembly_stats.contig_n50__lt': ___,
        'metadata.assembly_stats.scaffold_n50__lt': ____,
        ...remainingSearchForm
    } = itemStore.stores[props.model].searchForm

    // Helper function to manage setting the correct threshold
    const applyEBPFilter = (filterValue: boolean | null, field: string, threshold: number) => {
        if (filterValue === true) {
            remainingSearchForm[`${field}__gt`] = threshold;
        } else if (filterValue === false) {
            remainingSearchForm[`${field}__lt`] = threshold;
        }
    };
    // Apply filter for contig and scaffold
    applyEBPFilter(ebpFilter.contig, 'metadata.assembly_stats.contig_n50', 1000000);
    applyEBPFilter(ebpFilter.scaffold, 'metadata.assembly_stats.scaffold_n50', 10000000);

    // Update searchForm with remaining fields and the new filters
    itemStore.stores[props.model].searchForm = { ...remainingSearchForm };

    await handleQuery();

}, { deep: true });

async function createFilters() {
    const { filters } = useConfig(props.model)
    currentFilters.value = [
        ...filters.value.sort((a, b) => (a.type === 'checkbox' ? 1 : 0) - (b.type === 'checkbox' ? 1 : 0))
    ];
    const selects = filters.value.filter((item: ConfigFilter) => item.type === 'select')
    //filter existing frequencies and add new
    const filteredFreqs = itemStore.frequencies.filter(f => selects.findIndex(s => s.key === f.field && f.model === props.model && f.source === props.model) !== -1)
    //add new selects
    const newSelects = selects.filter(s => filteredFreqs.findIndex(f => f.field === s.key) === -1)
    for (const select of newSelects) {
        await itemStore.getFrequencies(props.model, props.model, select.key, false)
    }
}


watch(() => props.model, async () => {
    await createFilters()
});

// Fetch filters when the component mounts
onMounted(async () => await createFilters());


function getValue(field: ConfigFilter) {
    if (field.type === 'date') return dateModels.value[field.key]
    if (field.type === 'checkbox') return searchForm.value[`${field.key}__exists`]
    return searchForm.value[field.key]
}
// Utility to determine the field component based on its type
function getFieldComponent(type: string) {
    switch (type) {
        case 'select': return Select;
        case 'checkbox': return CheckBox;
        case 'date': return DateInput;
        default: return Input; // Default fallback
    }
}

async function handleQuery() {
    itemStore.resetPagination(props.model)
    await itemStore.fetchItems(props.model)
    await fetchFrequencies(props.model)
}

async function fetchFrequencies(model: DataModels) {
    const selectFields = currentFilters.value
        .filter((field: ConfigFilter) => field.type === 'select')
        .map((field: ConfigFilter) => field.key);
    for (const field of selectFields) {
        await itemStore.getFrequencies(model, model, field, false);
    }
}

function getLabel(key: string) {
    return key.includes('metadata.') ? key.split('.').pop() || key : key.replace(/_/g, ' ');
}

async function updateSearchForm(filter: ConfigFilter, value: any) {
    const { key, type } = filter
    if (type === 'date') {
        itemStore.stores[props.model].searchForm[`${key}__gte`] = value && value.start ? value.start.toISOString().split('T')[0] : null;
        itemStore.stores[props.model].searchForm[`${key}__lte`] = value && value.end ? value.end.toISOString().split('T')[0] : null;
    } else if (type === 'checkbox') {
        itemStore.stores[props.model].searchForm[`${key}__exists`] = value
    } else {
        itemStore.stores[props.model].searchForm[key] = value;
    }

    await handleQuery()
}

async function resetSearchForm() {
    const { filter, sort_column, sort_order, ...entries } = itemStore.stores[props.model].searchForm
    // Replace all values in `entries` with `null`
    Object.keys(entries).forEach(key => {
        entries[key] = null;
    });
    itemStore.stores[props.model].searchForm = { filter, sort_column, sort_order, ...entries }
    await handleQuery()

}
</script>
