<template>
    <div class="option-list">
        <div class="option-list-header">
            <VaInput v-model="searchQuery" placeholder="Search..." class="search-input" clearable />
        </div>

        <div class="option-list-content" v-if="!isLoading">
            <div v-for="option in filteredOptions" :key="option"
                :class="['option-item', { 'is-selected': isSelected(option) }]" @click="toggleOption(option)">
                <div class="option-content">
                    <span class="option-label">{{ getOptionLabel(option) }}</span>
                    <VaChip v-if="options" size="small" class="option-count">
                        {{ options[option] }}
                    </VaChip>
                </div>
                <VaIcon v-if="isSelected(option)" name="fa-check" class="check-icon" />
            </div>
        </div>

        <div v-else class="option-list-loading">
            <VaIcon size="small" name="loop" spin="counter-clockwise" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useItemStore } from '../../stores/items-store';
import { useMapStore } from '../../stores/map-store';
import { DataModels } from '../../data/types';

const itemStore = useItemStore()
const mapStore = useMapStore()

const props = defineProps<{
    label?: string,
    field: string,
    model: DataModels,
    value: string | null,
}>()


const isLoading = ref(false)
const searchQuery = ref('')
const options = ref<Record<string, number> | null>(null)
const countryLabels = ref<Record<string, string>>({})
const query = computed(() => itemStore.buildQuery())

const selectedOptions = computed(() => {
    if (props.value) return props.value.split(',')
    return []
})

const filteredOptions = computed(() => {
    if (!options.value) return []
    const query = searchQuery.value.toLowerCase()
    return Object.entries(options.value)
        .filter(([key]) => getOptionLabel(key).toLowerCase().includes(query))
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([key]) => key)
})

function getOptionLabel(key: string): string {
    if (props.field === 'countries') {
        return countryLabels.value[key] || key
    }
    return key
}

function isSelected(option: string): boolean {
    return selectedOptions.value.includes(option)
}

async function toggleOption(option: string) {
    const newSelection = [...selectedOptions.value]
    const index = newSelection.indexOf(option)

    if (index === -1) {
        newSelection.push(option)
    } else {
        newSelection.splice(index, 1)
    }
    emits('valueChange', newSelection.join(','))
    
    if (!newSelection.length) {
        await fetchOptions()
    }
}

async function fetchOptions() {
    isLoading.value = true
    try {
        if (props.field === 'countries') {
            await mapStore.getCountries({ ...query.value })
            options.value = mapStore.countries.reduce((acc, country) => ({
                ...acc,
                [country.countryId]: country.occurrences
            }), {})
            countryLabels.value = mapStore.countries.reduce((acc, country) => ({
                ...acc,
                [country.countryId]: country.countryName
            }), {})
        } else {
            const opts = await itemStore.getFieldFrequencies(props.model, props.field)
            options.value = { ...opts }
        }
    } finally {
        isLoading.value = false
    }
}

// Fetch options when component is mounted
fetchOptions()

const emits = defineEmits(['valueChange'])
</script>

<style lang="scss" scoped>
.option-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 400px;
}

.option-list-header {
    padding: 0.5rem;
    border-bottom: 1px solid var(--va-background-border);
}

.search-input {
    width: 100%;
}

.option-list-content {
    overflow-y: auto;
    max-height: 300px;
}

.option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background-color: var(--va-background-secondary);
    }

    &.is-selected {
        background-color: var(--va-primary);
        color: white;

        .option-count {
            background-color: rgba(255, 255, 255, 0.2);
            color: white;
        }
    }
}

.option-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.option-label {
    font-weight: 500;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 200px;
}

.option-count {
    font-size: 0.75rem;
}

.check-icon {
    color: currentColor;
}

.option-list-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
}
</style>