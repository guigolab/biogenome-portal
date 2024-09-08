<template>
    <div class="row justify-space-between align-center">
        <div class="flex">
            <div class="row">
                <div class="flex">
                    <VaBadge overlap color="info" :text="activeFilters.length">
                        <FilterDropdown />

                    </VaBadge>

                </div>
                <div class="flex">
                    <VaMenu class="ml-2" :options="exportOptions" @selected="showModal">
                        <template #anchor>
                            <VaButton icon="cloud_download" preset="primary">Export</VaButton>
                        </template>
                    </VaMenu>
                </div>
                <div v-if="hasCharts" class="flex">
                    <VaButtonToggle :disabled="isFiltering" preset="secondary" v-model="itemStore.view"
                        :options="options" />
                </div>
            </div>
        </div>
        <div class="flex">
            <h4 class="va-h4">
                {{ total }} {{ t(`tabs.${model}`) }}
            </h4>
        </div>
    </div>
    <ExportTSV />
    <CreateChart />
</template>
<script setup lang="ts">
import FilterDropdown from '../dropdowns/FilterDropdown.vue'
import { computed, watch } from 'vue'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'
import ExportTSV from '../modals/ExportTSV.vue'
import CreateChart from '../modals/CreateChart.vue'
const { t } = useI18n()

const props = defineProps<{
    hasCharts: boolean
}>()

watch(() => props.hasCharts, () => {
    if (!props.hasCharts) itemStore.view = 'table'
})
type ExportType = {
    text: string
    icon: string
    value: 'showTsvModal' | 'showChartModal'
}

const options = [
    { value: "table", icon: "table_rows", },
    { value: "charts", icon: "leaderboard", },
]

const exportOptions = [
    { text: 'TSV', value: 'showTsvModal', icon: 'download' },
    { text: 'Chart', value: 'showChartModal', icon: 'insert_chart' },
]

const itemStore = useItemStore()

const model = computed(() => {
    return itemStore.currentModel
})

const isFiltering = computed(() => !!itemStore.stores[model.value].filter)

const total = computed(() => itemStore.stores[model.value].total)

const activeFilters = computed(() => {
    const entries = Object.entries(itemStore.stores[model.value].searchForm)
    return entries.filter(([k, v]) => (v || v === false) && !['filter', 'sort_order', 'sort_column'].includes(k))
})

// pretty print label
function getLabel(key: string) {
    if (key.includes('metadata.')) {
        const splittedKey = key.split('.')
        return splittedKey[splittedKey.length - 1]
    } else if (key.includes('_')) {
        return key.split('_').join(' ')
    } return key
}
function showModal(v: ExportType) {
    itemStore[v.value] = !itemStore[v.value]
}
</script>
<style>
.w-200 {
    max-width: 350px;
}

.p-4 {
    padding: 4px;
}
</style>
