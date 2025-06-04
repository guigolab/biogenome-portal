<template>
    <div v-for="(field, index) in currentFilters" :key="field.key" class="filter-item">
        <VaDropdown placement="bottom-start" stickToEdges :closeOnContentClick="false">
            <template #anchor>
                <VaBadge color="success" :dot="getBadgeDot(field)" overlap>
                    <VaButton :preset="getValue(field) ? 'primary' : 'secondary'" class="filter-button"
                        :icon="getFieldIcon(field.type)">
                        <span class="va-text-truncate">{{ getLabel(field.key) }}</span>
                    </VaButton>
                </VaBadge>
            </template>
            <div class="filter-dropdown-content">
                <component :is="getFieldComponent(field.type)" 
                    :value="getValue(field)" 
                    :key="field.key"
                    :field="field.key" 
                    :model="model" 
                    class="filter-input"
                    @valueChange="(v: any) => updateSearchForm(field, v)" />
            </div>
        </VaDropdown>
    </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import Input from './inputs/Input.vue'
import Select from './inputs/Select.vue'
import DateInput from './inputs/DateRange.vue'
import CheckBox from './inputs/CheckBox.vue'
import { ConfigFilter, DataModels } from '../data/types';
import { useItemStore } from '../stores/items-store';
import { useDateMapper } from '../composable/useDates';

const props = defineProps<{
    model: DataModels
    filters: ConfigFilter[],
}>()

const emits = defineEmits(['formUpdated'])
const itemStore = useItemStore();

// Memoize expensive computations
const searchForm = computed(() => itemStore.searchForm)
const dateModels = computed(() => useDateMapper(searchForm.value ?? {}))
const currentFilters = computed(() => 
    props.filters.sort((a, b) => (a.type === 'checkbox' ? 1 : 0) - (b.type === 'checkbox' ? 1 : 0))
)

// Cache field components to avoid recreating them
const fieldComponents = shallowRef({
    select: Select,
    checkbox: CheckBox,
    date: DateInput,
    input: Input
})

// Cache field icons to avoid recreating them
const fieldIcons = {
    select: 'fa-list',
    checkbox: 'fa-check-square',
    date: 'fa-calendar',
    input: 'fa-search',
    default: 'fa-filter'
} as const

// Memoize label formatting
const labelCache = new Map<string, string>()
function getLabel(key: string): string {
    if (labelCache.has(key)) {
        return labelCache.get(key)!
    }
    const label = key.includes('metadata.') ? key.split('.').pop() || key : key.replace(/_/g, ' ')
    labelCache.set(key, label)
    return label
}

function getBadgeDot(field: ConfigFilter): boolean {
    if (field.type === 'date') {
        return !!(dateModels.value[field.key]?.start || dateModels.value[field.key]?.end)
    }
    return !!getValue(field)
}

function getValue(field: ConfigFilter) {
    const { type, key } = field
    if (!searchForm.value) return null

    switch (type) {
        case 'date':
            return dateModels.value[key] ?? null
        case 'checkbox':
            return searchForm.value[`${key}__exists`] ?? null
        case 'select':
            return searchForm.value[`${key}__in`] ?? null
        case 'input':
            return searchForm.value[`${key}__icontains`] ?? null
        default:
            return searchForm.value[key] ?? null
    }
}
function getFieldComponent(type: string) {
    return fieldComponents.value[type as keyof typeof fieldComponents.value] || fieldComponents.value.input
}

function getFieldIcon(type: string): string {
    return fieldIcons[type as keyof typeof fieldIcons] || fieldIcons.default
}

// Memoize date formatting
const dateCache = new Map<string, string>()
function formatDate(date: Date | undefined): string | null {
    if (!date) return null
    
    const dateStr = date.toISOString()
    if (dateCache.has(dateStr)) {
        return dateCache.get(dateStr)!
    }
    
    const formatted = dateStr.split('T')[0]
    dateCache.set(dateStr, formatted)
    return formatted
}

async function updateSearchForm(filter: ConfigFilter, value: any) {
    const { key, type } = filter
    
    switch (type) {
        case 'date':
            itemStore.setSearchFormField(`${key}__gte`, formatDate(value?.start))
            itemStore.setSearchFormField(`${key}__lte`, formatDate(value?.end))
            break
        case 'checkbox':
            itemStore.setSearchFormField(`${key}__exists`, value)
            break
        case 'input':
            itemStore.setSearchFormField(`${key}__icontains`, value)
            break
        case 'select':
            itemStore.setSearchFormField(`${key}__in`, value)
            break
        default:
            itemStore.setSearchFormField(key, value)
    }

    emits('formUpdated')
}
</script>

<style lang="scss" scoped>
.model-filters {
    display: inline-flex;
    align-items: center;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
        display: none;
    }
}

.filters-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.5rem;
    align-items: center;
    padding: 0.25rem 0;
    min-width: min-content;
}

.filter-item {
    flex: 0 0 auto;
}

.filter-button {
    font-weight: 500;
    min-width: 120px;
    max-width: 200px;
    transition: all 0.2s ease;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    white-space: nowrap;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
}

.filter-dropdown-content {
    padding: 1rem;
    max-width: 350px;
    background: var(--va-background-secondary);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.filter-input {
    width: 100%;

    :deep(.va-input-wrapper) {
        background: var(--va-background-secondary);
    }

    :deep(.va-select) {
        width: 100%;
    }

    :deep(.va-input) {
        width: 100%;
    }
}

@media (max-width: 768px) {
    .filters-row {
        padding: 0.25rem 0.5rem;
    }
}
</style>
