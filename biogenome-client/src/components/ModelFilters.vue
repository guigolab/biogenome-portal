<template>
    <div class="row align-center">
        <div class="flex lg12 md12 sm12 xs12" v-for="(field, index) in currentFilters" :key="index">
            <component  :is="getFieldComponent(field.type)" :value="getValue(field)" :label="getLabel(field.key)"
                :key="field.key" :field="field.key" :model="model" class="m-2"
                @valueChange="(v: any) => updateSearchForm(field, v)">
            </component>
        </div>
    </div>
    <div v-if="showEBPMetrics" class="row align-center">
        <!-- <div v-if="hasCountries" class="flex">
            <CountrySelect />
        </div> -->
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard outlined square>
                <VaCardContent>
                    <span class="va-text-bold">EBP metrics</span>
                    <p>Assemblies compliant with the Earth BioGenome Project quality standards</p>
                    <VaDivider orientation="left"></VaDivider>
                    <div class="row">
                        <div class="flex">
                            <VaCheckbox indeterminate :label="'Contig N50 > 1MB'" v-model="ebpFilter.contig" />
                        </div>
                        <div class="flex">
                            <VaCheckbox indeterminate :label="'Scaffold N50 > 10MB'" v-model="ebpFilter.scaffold" />
                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive,  watch } from 'vue';
// import { useItemStore } from '../stores/items-store';
import Input from './inputs/Input.vue'
import Select from './inputs/Select.vue'
import DateInput from './inputs/DateRange.vue'
import CheckBox from './inputs/CheckBox.vue'
import { useDateMapper } from '../composable/useDates'
import { AppConfig, ConfigFilter, DataModels } from '../data/types';
import CountrySelect from './inputs/CountrySelect.vue';
import { useItemStore } from '../stores/items-store';

const config = inject('appConfig') as AppConfig

const props = defineProps<{
    model: DataModels
    filters: ConfigFilter[]
}>()

const ebpRelated = Boolean(config.general.ebp_related)
const showEBPMetrics = computed(() => props.model === 'assemblies' && ebpRelated)
const hasCountries = computed(() => props.model === 'organisms' && config.general.maps.includes('countries'))

const itemStore = useItemStore();
const searchForm = computed(() => itemStore.searchForm)
const dateModels = computed(() => useDateMapper(searchForm.value??{}));
const currentFilters = computed(() => props.filters.sort((a, b) => (a.type === 'checkbox' ? 1 : 0) - (b.type === 'checkbox' ? 1 : 0)))

function getValue(field: ConfigFilter) {
    if (field.type === 'date') return dateModels.value[field.key]
    if (field.type === 'checkbox') return searchForm.value?.[`${field.key}__exists`]
    return searchForm.value?.[field.key]
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

function getLabel(key: string) {
    return key.includes('metadata.') ? key.split('.').pop() || key : key.replace(/_/g, ' ');
}
// Helper function to format date values
function formatDate(date: Date | undefined) {
    return date ? date.toISOString().split('T')[0] : null;
}
const ebpFilter = reactive({
    contig: getN50('metadata.assembly_stats.contig_n50'),
    scaffold: getN50('metadata.assembly_stats.scaffold_n50')
})

// Get N50 threshold value
function getN50(field: string) {
    const value = itemStore.searchForm?.[`${field}__gt`] ? true
        : itemStore.searchForm?.[`${field}__lt`] ? false
            : null;
    return value;
}

watch(ebpFilter, async () => {
    if (!showEBPMetrics.value) return
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

    await itemStore.handleQuery();

}, { deep: true });

async function updateSearchForm(filter: ConfigFilter, value: any) {
    const { key, type } = filter
    if (type === 'date') {
        itemStore.setSearchFormField( `${key}__gte`, formatDate(value?.start));
        itemStore.setSearchFormField(`${key}__lte`, formatDate(value?.end));
    } else if (type === 'checkbox') {
        itemStore.setSearchFormField( `${key}__exists`, value);
    } else {
        itemStore.setSearchFormField(key, value);
    }

    await itemStore.handleQuery();
}

</script>
