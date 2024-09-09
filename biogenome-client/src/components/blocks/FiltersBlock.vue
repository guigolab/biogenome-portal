<template>
    <div class="row justify-space-between align-center">
        <div class="flex">
            <div class="row align-center">
                <div v-if="modelFilterEntries.length" class="flex">
                    <FilterDropdown />
                </div>
                <div class="flex">
                    <VaMenu>
                        <VaMenuItem v-if="isGoaTActive" @selected="downloadGoatReport">
                            GoaT
                        </VaMenuItem>
                        <VaMenuItem @selected="itemStore.showTsvModal = !itemStore.showTsvModal">
                            Report
                        </VaMenuItem>
                        <VaMenuItem @selected="itemStore.showChartModal = !itemStore.showChartModal">
                            Chart
                        </VaMenuItem>
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
import general from '../../../configs/general.json'
import GoaTService from '../../services/clients/GoaTService'

const { t } = useI18n()

const props = defineProps<{
    hasCharts: boolean
}>()

watch(() => props.hasCharts, () => {
    if (!props.hasCharts) itemStore.view = 'table'
})

const options = [
    { value: "table", icon: "table_rows", },
    { value: "charts", icon: "leaderboard", },
]
const staticColumns = ['filter', 'sort_order', 'sort_column']

const itemStore = useItemStore()

const model = computed(() => {
    return itemStore.currentModel
})

const isGoaTActive = computed(() => {
    return model.value === 'organisms' && general.goat
})

const isFiltering = computed(() => !!itemStore.stores[model.value].searchForm.filter)

const total = computed(() => itemStore.stores[model.value].total)

const modelFilterEntries = computed(() => Object.entries(itemStore.stores[model.value].searchForm)
    .filter(([k, v]) => !staticColumns.includes(k)))

const activeFilters = computed(() => modelFilterEntries.value
    .filter(([k, v]) => (v || v === false))
)


async function downloadGoatReport() {
    try {
        const response = await GoaTService.getGoatReport()
        const data = response.data
        const href = URL.createObjectURL(data);

        const filename = response.headers['content-disposition']
        const match = filename.match(/filename=([^;]+)/);
        let name = ''
        if (match && match[1]) {
            name = match[1];
        } else {
            name = 'file.tsv'
            console.log("Filename not found in the string.");
        }
        // create "a" HTML element with href to file & click
        const link = document.createElement('a');
        link.href = href;
        link.setAttribute('download', name); //or any other extension
        document.body.appendChild(link);
        link.click();
        // clean up "a" element & remove ObjectURL
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    } catch (err) {
        console.error(err)
        itemStore.toast({ message: 'Error downloading Goat Report', color: 'danger' })
    }

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
