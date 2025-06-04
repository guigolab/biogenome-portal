<template>
    <VaDropdown placement="bottom-start" stickToEdges :closeOnContentClick="false">
        <template #anchor>
            <VaBadge color="success" :dot="hasActiveMetrics" overlap>

                <VaButton :preset="hasActiveMetrics ? 'primary' : 'secondary'" color="primary" class="filter-button"
                    icon="fa-chart-line">
                    {{ t('items.filters.ebpMetricsTitle') }}

                </VaButton>
            </VaBadge>

        </template>

        <div class="filter-dropdown-content">
            <div class="ebp-metrics-content">
                <p class="va-text-secondary mb-4">{{ t('items.filters.ebpMetricsDescription') }}</p>
                <div class="metrics-list">
                    <div class="metric-item">
                        <VaSwitch size="small" v-model="contigFilter" @update:modelValue="handleContigFilter" label="Contig N50 > 1MB" />
                    </div>
                    <div class="metric-item">
                        <VaSwitch size="small" v-model="scaffoldFilter" @update:modelValue="handleScaffoldFilter" label="Scaffold N50 > 10MB"  />
                    </div>
                </div>
            </div>
        </div>
    </VaDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useItemStore } from '../stores/items-store'
import { DataModels } from '../data/types'

const { t } = useI18n()
const itemStore = useItemStore()
const props = defineProps<{
    model: DataModels
}>()

const contigFilter = computed({
    get: () => itemStore.searchForm["metadata.assembly_stats.contig_n50__gt"] ? true : false,
    set: (value) => {
        itemStore.setSearchFormField("metadata.assembly_stats.contig_n50__gt", value ? 10000 : null)
        emits('form-updated')
    }
})

const scaffoldFilter = computed({
    get: () => itemStore.searchForm["metadata.assembly_stats.scaffold_n50__gt"] ? true : false,
    set: (value) => {
        itemStore.setSearchFormField("metadata.assembly_stats.scaffold_n50__gt", value ? 10000 : null)
        emits('form-updated')
    }
})

const emits = defineEmits(['form-updated'])

const hasActiveMetrics = computed(() => contigFilter.value || scaffoldFilter.value)


async function handleScaffoldFilter(value: boolean) {
    await handleFilter(value, "metadata.assembly_stats.scaffold_n50__gte", 10000000)
}

async function handleContigFilter(value: boolean) {
    await handleFilter(value, "metadata.assembly_stats.contig_n50__gte", 1000000)
}

async function handleFilter(value: boolean, field: string, threshold: number) {
    itemStore.setSearchFormField(field, value ? threshold : false)
    await itemStore.fetchItems(props.model)
}


</script>

<style lang="scss" scoped>
.ebp-metrics-content {
    padding: 0.5rem;
}

.metrics-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.metric-item {
    padding: 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: var(--va-background-secondary);
    }
}

.filter-button {
    font-weight: 500;
    min-width: 120px;
    transition: all 0.2s ease;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
}

.filter-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    font-size: 0.75rem;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
}

.filter-dropdown-content {
    padding: 1rem;
    min-width: 250px;
    background: var(--va-background-primary);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>