<template>
  <Doughnut :chart-id="chartId" :plugins="[ChartDataLabels]" :chart-data="chartData" :chart-options="chartOptions" />
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useItemStore } from '../../stores/items-store';
import { InfoBlock } from '../../data/types'
import { computed, ref, watch } from 'vue';
import { processChartData, getChartOptions } from './configs';


const itemStore = useItemStore()
// Define props
const props = defineProps<{ infoBlock: InfoBlock, label: string, chartId: string }>();

const { model, field, type } = props.infoBlock;

watch(
  () => itemStore.stores[model].searchForm, // Watch this part of the store
  async () => {
    await fetchData(); // Fetch the updated data when changes are detected
  },
  { deep: true });
// Ref to hold the data
const data = ref<Record<string, number>>({});

// Initial data fetch from the store
const fetchData = async () => {
  data.value = await itemStore.getStats(model, field);
};
await fetchData()


const chartOptions = computed(() => {
  const total = Object.values(data.value).reduce((acc, val) => acc + val, 0)
  return getChartOptions(type, total)
})
const chartData = computed(() => {
  return processChartData(data.value, props.label)
})
</script>
