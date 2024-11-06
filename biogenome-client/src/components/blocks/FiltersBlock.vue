<template>
    <FilterBar :model="model" :hasCharts="hasCharts" />

    <FilterSidebar>
        <FilterForm :model="model" />
    </FilterSidebar>
    <ExportTSV :model="model"/>
    <CreateChart :model="model" />
</template>
<script setup lang="ts">
import ExportTSV from '../modals/ExportTSV.vue'
import CreateChart from '../modals/CreateChart.vue'
import FilterBar from '../bars/FilterBar.vue'
import FilterSidebar from '../sidebars/FilterSidebar.vue'
import { DataModels } from '../../data/types'
import FilterForm from '../forms/FilterForm.vue'

const props = defineProps<{
    hasCharts: boolean,
    model: DataModels,
}>()




</script>
