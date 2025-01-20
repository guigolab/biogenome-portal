<template>
  <Doughnut :chart-id="chartId" :plugins="[ChartDataLabels]" :chart-data="chartData" :chart-options="chartOptions" />
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { computed } from 'vue';
import { processChartData, getChartOptions } from './configs';
// Define props
const props = defineProps<{ data: Record<string, number>, label: string, chartId: string }>();

const chartOptions = computed(() => {
  const total = Object.values(props.data).reduce((acc, val) => acc + val, 0)
  return getChartOptions('pie', total)
})

const chartData = computed(() => {
  return processChartData(props.data, props.label)
})

</script>
