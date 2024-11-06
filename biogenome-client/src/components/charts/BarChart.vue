<template>
    <Bar :chart-id="chartId" :plugins="[ChartDataLabels]" :chart-data="chartData" :chart-options="chartOptions" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { processChartData, getChartOptions } from './configs';

// Define props
const props = defineProps<{ data: Record<string, number>, label: string, chartId: string }>();

const chartOptions = computed(() => {
    const total = Object.values(props.data).reduce((acc, val) => acc + val, 0)
    return getChartOptions('bar', total)
})
const chartData = computed(() => {
    return processChartData(props.data, props.label)
})
</script>