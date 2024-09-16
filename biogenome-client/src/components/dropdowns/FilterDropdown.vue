<template>
    <VaBadge overlap color="info" :text="activeFilters.length">

        <VaButtonDropdown preset="primary" placement="left-bottom" left-icon stickToEdges :closeOnContentClick="false"
            icon="tune" :label="t('buttons.filters')">
            <div class="w-200">
                <div class="p-4">
                    <p class="va-text-secondary">Filters apply to both table and chart views</p>
                </div>

                <div class="p-4" v-for="(field, index) in currentFilters" :key="index">
                    <component :is="getFieldComponent(field.type)" :value="getValue(field)" :label="getLabel(field.key)"
                        :options="currentFrequencies[field.key]" :key="field.key" class="m-2"
                        @valueChange="(v: any) => updateSearchForm(field, v)">
                    </component>
                </div>

                <div v-if="showEBPMetrics">
                    <VaDivider style="margin-bottom: 12px;">EBP metrics</VaDivider>
                    <div class="p-4">
                        <VaCheckbox indeterminate :label="'Contig N50 > 1MB'" v-model="ebpFilter.contig" />
                    </div>
                    <div class="p-4">
                        <VaCheckbox indeterminate :label="'Scaffold N50 > 10MB'" v-model="ebpFilter.scaffold" />
                    </div>
                </div>

                <div class="p-4">
                    <VaButton :disabled="activeFilters.length === 0" @click="resetSearchForm" size="small"
                        color="danger">
                        Reset
                        all
                    </VaButton>
                </div>
            </div>
        </VaButtonDropdown>
    </VaBadge>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useItemStore } from '../../stores/items-store';
import filtersConfig from '../../../configs/filters.json';
import general from '../../../configs/general.json';
import Input from '../inputs/Input.vue'
import Select from '../inputs/Select.vue'
import DateInput from '../inputs/DateRange.vue'
import CheckBox from '../inputs/CheckBox.vue'
import { useDateMapper } from '../../composable/useDates'
import { useFilters } from '../../composable/useFilters'
import { ConfigFilter } from '../../data/types';

const { t } = useI18n();
const itemStore = useItemStore();

const ebpRelated = Boolean(general.ebp_related)

const staticColumns = ['filter', 'sort_order', 'sort_column']

const showEBPMetrics = computed(() => itemStore.currentModel === 'assemblies' && ebpRelated)

const model = computed(() => itemStore.currentModel as keyof typeof filtersConfig);

const searchForm = computed(() => itemStore.stores[model.value].searchForm)

const dateModels = computed(() => useDateMapper(searchForm.value));

const { currentFilters, frequencies, fetchFrequencies, createFilters } = useFilters()

const currentFrequencies = computed(() => frequencies[model.value])
// Watch for model changes and update filters

const modelFilterEntries = computed(() => Object.entries(itemStore.stores[model.value].searchForm)
    .filter(([k, v]) => !staticColumns.includes(k)))

const activeFilters = computed(() => modelFilterEntries.value
    .filter(([k, v]) => (v || v === false))
)
const ebpFilter = reactive({
    contig: getN50('metadata.assembly_stats.contig_n50'),
    scaffold: getN50('metadata.assembly_stats.scaffold_n50')
})

function getN50(field: string) {
    let v = null
    if (itemStore.stores[model.value].searchForm[`${field}__gt`]) {
        v = true
    } else if (itemStore.stores[model.value].searchForm[`${field}__lt`]) {
        v = false
    }
    return v
}

watch(ebpFilter, async () => {
    const {
        'metadata.assembly_stats.contig_n50__gt': _,
        'metadata.assembly_stats.scaffold_n50__gt': __,
        'metadata.assembly_stats.contig_n50__lt': ___,
        'metadata.assembly_stats.scaffold_n50__lt': ____,
        ...remainingSearchForm
    } = itemStore.stores[model.value].searchForm

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
    itemStore.stores[model.value].searchForm = { ...remainingSearchForm };

    await handleQuery();

}, { deep: true });




watch(() => model.value, async () => {
    createFilters(model.value)
});

// Fetch filters when the component mounts
onMounted(async () => await createFilters(model.value));


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
    itemStore.resetPagination()
    await itemStore.fetchItems()
    await fetchFrequencies(model.value)
}
// pretty print label
function getLabel(key: string) {
    if (key.includes('metadata.')) {
        const splittedKey = key.split('.')
        return splittedKey[splittedKey.length - 1]
    } else if (key.includes('_')) {
        return key.split('_').join(' ')
    } return key
}

async function updateSearchForm(filter: ConfigFilter, value: any) {
    const { key, type } = filter
    if (type === 'date') {
        itemStore.stores[model.value].searchForm[`${key}__gte`] = value && value.start ? value.start.toISOString().split('T')[0] : null;
        itemStore.stores[model.value].searchForm[`${key}__lte`] = value && value.end ? value.end.toISOString().split('T')[0] : null;
    } else if (type === 'checkbox') {
        itemStore.stores[model.value].searchForm[`${key}__exists`] = value
    } else {
        itemStore.stores[model.value].searchForm[key] = value;
    }

    await handleQuery()
}

async function resetSearchForm() {
    const { filter, sort_column, sort_order, ...entries } = itemStore.stores[model.value].searchForm
    // Replace all values in `entries` with `null`
    Object.keys(entries).forEach(key => {
        entries[key] = null;
    });
    itemStore.stores[model.value].searchForm = { filter, sort_column, sort_order, ...entries }
    await handleQuery()

}
</script>
