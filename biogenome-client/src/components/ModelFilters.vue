<template>
    <div class="row align-center">
        <div class="flex lg12 md12 sm12 xs12" v-for="(field, index) in currentFilters" :key="index">
            <component :is="getFieldComponent(field.type)" :value="getValue(field)" :label="getLabel(field.key)"
                :key="field.key" :field="field.key" :model="model" class="m-2"
                @valueChange="(v: any) => updateSearchForm(field, v)">
            </component>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Input from './inputs/Input.vue'
import Select from './inputs/Select.vue'
import DateInput from './inputs/DateRange.vue'
import CheckBox from './inputs/CheckBox.vue'
import { useDateMapper } from '../composable/useDates'
import { ConfigFilter, DataModels } from '../data/types';
import { useItemStore } from '../stores/items-store';

const props = defineProps<{
    model: DataModels
    filters: ConfigFilter[],
}>()

const emits = defineEmits(['formUpdated'])
const itemStore = useItemStore();
const searchForm = computed(() => itemStore.searchForm)
const dateModels = computed(() => useDateMapper(searchForm.value ?? {}));
const currentFilters = computed(() => props.filters.sort((a, b) => (a.type === 'checkbox' ? 1 : 0) - (b.type === 'checkbox' ? 1 : 0)))
function getValue(field: ConfigFilter) {
    const { type, key } = field
    if (type === 'date') return dateModels.value[key]??null
    else if (type === 'checkbox') return searchForm.value?.[`${key}__exists`]??null
    else if (type === 'select') return searchForm.value?.[`${key}__in`]??null
    else if (type === 'input') return searchForm.value?.[`${key}__icontains`]??null
    return searchForm.value?.[field.key]??null
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

//Map 
function updateSearchForm(filter: ConfigFilter, value: any) {
    const { key, type } = filter
    if (type === 'date') {
        itemStore.setSearchFormField(`${key}__gte`, formatDate(value?.start));
        itemStore.setSearchFormField(`${key}__lte`, formatDate(value?.end));
    } else if (type === 'checkbox') {
        itemStore.setSearchFormField(`${key}__exists`, value);
    } else if (type === 'input') {
        itemStore.setSearchFormField(`${key}__icontains`, value);
    } else if (type === 'select') {
        itemStore.setSearchFormField(`${key}__in`, value);
    } else {
        itemStore.setSearchFormField(key, value);
    }

    emits('formUpdated')
    // await itemStore.handleQuery();
}

</script>
