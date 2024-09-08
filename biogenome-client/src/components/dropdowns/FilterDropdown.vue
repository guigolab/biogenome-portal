<template>
    <VaButtonDropdown left-icon stickToEdges :closeOnContentClick="false" icon="tune" :label="t('buttons.filters')">
        <div class="w-200">
            <div class="p-4">
                <p class="va-text-secondary">Filters apply to both table and chart view</p>
            </div>

            <div class="p-4" v-for="(field, index) in currentFilters" :key="index">

                <component :is="getFieldComponent(field.type)" :value="getValue(field)" :label="getLabel(field.key)"
                    :options="currentFrequencies[field.key]" :key="field.key" class="m-2"
                    @valueChange="(v: any) => updateSearchForm(field, v)">
                </component>
            </div>
        </div>
    </VaButtonDropdown>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useItemStore } from '../../stores/items-store';
import filtersConfig from '../../../configs/filters.json';
import Input from '../inputs/Input.vue'
import Select from '../inputs/Select.vue'
import DateInput from '../inputs/DateRange.vue'
import CheckBox from '../inputs/CheckBox.vue'
import { useDateMapper } from '../../composable/useDates'
import { useFilters } from '../../composable/useFilters'
import { ConfigFilter } from '../../data/types';

const { t } = useI18n();
const itemStore = useItemStore();

const model = computed(() => itemStore.currentModel as keyof typeof filtersConfig);

const searchForm = computed(() => itemStore.stores[model.value].searchForm)

const dateModels = computed(() => useDateMapper(searchForm.value));

const { currentFilters, frequencies, fetchFrequencies, createFilters } = useFilters()

const currentFrequencies = computed(() => frequencies[model.value])
// Watch for model changes and update filters
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

    itemStore.resetPagination()
    await itemStore.fetchItems()
    await fetchFrequencies(model.value)
}

</script>
