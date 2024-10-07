<template>
    <div class="row justify-space-between align-center">
        <div class="flex">
            <div class="row align-center">
                <div v-if="modelFilterEntries.length" class="flex">
                    <FilterDropdown />
                </div>
                <div class="flex">
                    <VaMenu>
                        <VaMenuItem icon="article" @selected="itemStore.showTsvModal = !itemStore.showTsvModal">
                            Report
                        </VaMenuItem>
                        <VaMenuItem icon="insert_chart"
                            @selected="itemStore.showChartModal = !itemStore.showChartModal">
                            Chart
                        </VaMenuItem>
                        <template #anchor>
                            <VaButton preset="primary" icon="cloud_download">Export</VaButton>
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

const emits = defineEmits(['toggleFilter'])
const options = [
    { value: "table", icon: "table_rows", },
    { value: "charts", icon: "leaderboard", },
]
const staticColumns = ['filter', 'sort_order', 'sort_column']

const itemStore = useItemStore()

const model = computed(() => {
    return itemStore.currentModel
})

const isFiltering = computed(() => !!itemStore.stores[model.value].searchForm.filter)

const total = computed(() => itemStore.stores[model.value].total)

const modelFilterEntries = computed(() => Object.entries(itemStore.stores[model.value].searchForm)
    .filter(([k, v]) => !staticColumns.includes(k)))


</script>
<style>
.w-200 {
    max-width: 350px;
}

.p-4 {
    padding: 4px;
}
</style>
