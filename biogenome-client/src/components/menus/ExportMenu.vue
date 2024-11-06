<template>
    <VaMenu>
        <VaMenuItem icon="fa-list" @selected="itemStore.showTsvModal = !itemStore.showTsvModal">
            Report
        </VaMenuItem>
        <VaMenuItem icon="fa-chart-simple" @selected="itemStore.showChartModal = !itemStore.showChartModal">
            Chart
        </VaMenuItem>
        <template #anchor>
            <VaButton preset="primary" color="secondary" icon="fa-download">Export</VaButton>
        </template>
    </VaMenu>
    <CreateChart/>
    <ExportTSV/>
</template>
<script setup lang="ts">
import { useItemStore } from '../../stores/items-store';
import CreateChart from '../modals/CreateChart.vue';
import ExportTSV from '../modals/ExportTSV.vue';


const itemStore = useItemStore()

</script>