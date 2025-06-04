<template>
    <div class="items-filter">
        <div class="filter-sections">
            <div class="left-section">
                <AddFilterDropdown :model="model" />
                <div class="filters-content">
                    <div class="filters-row">
                        <ModelFilters @form-updated="itemStore.fetchItems(model)"
                            :filters="customFilters" :model="model" />
                        <ModelFilters @form-updated="itemStore.fetchItems(model)" :filters="filters"
                            :model="model" />
                        <CountriesDropdown v-if="showCountries" :model="model" />
                        <EBPMetricsDropdown v-if="showEBPMetrics" @form-updated="itemStore.fetchItems(model)" :model="model" />
                    </div>
                </div>
            </div>
            <div class="right-section">
                <div class="view-actions">
                    <VaButton 
                        v-if="itemStore.view === 'charts'"
                        @click="itemStore.showChartModal = true"
                        icon="leaderboard"
                        color="primary"
                        class="action-button"
                    >
                        {{ t('buttons.createChart') }}
                    </VaButton>
                    <VaButton 
                        v-if="itemStore.view === 'table'"
                        @click="itemStore.showTsvModal = true"
                        icon="fa-file-arrow-down"
                        color="primary"
                        class="action-button"
                    >
                        {{ t('items.data.reportBtn') }}
                    </VaButton>
                    <div class="view-toggle" v-if="hasCharts">
                        <VaButton 
                            v-for="opt in viewOptions" 
                            :key="opt.value"
                            :color="opt.value === itemStore.view ? 'primary' : 'secondary'"
                            :preset="opt.value === itemStore.view ? 'primary' : 'secondary'" 
                            :icon="opt.icon"
                            @click="itemStore.view = opt.value" 
                            class="action-button" 
                        />
                    </div>
                </div>
            </div>
        </div>
        <CreateChart :key="model" :model="model" :filters="filters" />
        <ExportTSV :model="model" :columns="columns" />
    </div>
</template>

<script setup lang="ts">
import { computed, inject, watch } from 'vue'
import { DataModels, AppConfig, ConfigModel } from '../data/types'
import ModelFilters from '../components/ModelFilters.vue'
import { useItemStore } from '../stores/items-store'
import { useI18n } from 'vue-i18n'
import ExportTSV from '../components/ModelExport.vue'
import CreateChart from '../components/ModelChart.vue'
import EBPMetricsDropdown from './EBPMetricsDropdown.vue'
import CountriesDropdown from './CountriesDropdown.vue'
import AddFilterDropdown from './AddFilterDropdown.vue'

const { t } = useI18n()
const config = inject('appConfig') as AppConfig

const props = defineProps<{
    model: DataModels
    hasCharts: boolean
}>()

const ebpRelated = Boolean(config.general.ebpRelated)
const showEBPMetrics = computed(() => props.model === 'assemblies' && ebpRelated)

const itemStore = useItemStore()

const customFilters = computed(() => itemStore.customFilters)
const modelConfigs = computed(() => config.models[props.model] as ConfigModel)
const filters = computed(() => modelConfigs.value.filters ?? [])
const showCountries = computed(() => props.model === 'organisms' && config.general.showCountries)
const columns = computed(() => modelConfigs.value.columns ?? [])

const viewOptions: { value: 'table' | 'charts', icon: string }[] = [
    { value: "table", icon: "fa-table" },
    { value: "charts", icon: "leaderboard" },
]

watch(() => props.hasCharts, (newVal) => {
    if (!newVal) {
        itemStore.view = 'table'
    }
})



/* 
watch(() => mapStore.hasCountries, () => {
    if (!mapStore.hasCountries) {
        mapStore.selectedCountries = []
        mapStore.showCountriesMap = false
        filterStore.setPendingFilter('countries__in', null)
    }
}) */

/* async function handleUpdate() {

    if (showCountries.value) {
        filterStore.setPendingFilter('countries__in', null)
        const activeFilters = filterStore.getActiveFilters
        await mapStore.getCountries({ ...Object.fromEntries(Object.entries(activeFilters)), taxon_lineage })
        mapStore.selectedCountries = []
    }
    await itemStore.fetchItems(props.model)
} */

</script>

<style lang="scss" scoped>
.items-filter {
    width: 100%;
    display: flex;
    flex-direction: column;
}

.filter-sections {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.left-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
}

.filters-content {
    flex: 1;
    overflow-x: auto;
    padding: 0;
    min-width: 0;
}

.filters-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.5rem;
    align-items: center;
    padding: 0.25rem 0;
}

.right-section {
    display: flex;
    align-items: center;
}

.view-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.view-toggle {
    display: flex;
    gap: 0.25rem;
}

.action-button {
    font-weight: 500;
    min-width: 100px;
    height: 32px;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
    border-radius: 6px;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    &:active {
        box-shadow: 0 0 0 2px var(--va-primary);
    }
}

@media (max-width: 768px) {
    .filter-sections {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
    }

    .left-section {
        flex-direction: column;
        align-items: stretch;
    }

    .right-section {
        justify-content: flex-end;
    }

    .view-actions {
        flex-direction: column;
        align-items: flex-end;
    }

    .view-toggle {
        margin-top: 0.5rem;
    }
}
</style>