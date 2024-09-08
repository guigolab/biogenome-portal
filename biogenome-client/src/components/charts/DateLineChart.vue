<template>
  <Line :chart-id="chartId" :chart-data="chartData" :chart-options="options" />
</template>

<script async setup lang="ts">
import { InfoBlock } from '../../data/types';
import { Line } from 'vue-chartjs';
import { useColors } from 'vuestic-ui';
import { computed, watch, ref } from 'vue';
import { useItemStore } from '../../stores/items-store';

const props = defineProps<{
  infoBlock: InfoBlock,
  label: string,
  chartId: string,
}>();

// Pinia store
const itemStore = useItemStore();
const colors = useColors();

// Extract model and field from props
const { model, field } = props.infoBlock;

// Ref to hold the data
const data = ref<Record<string, number>>({});

// Initial data fetch from the store
const fetchData = async () => {
  data.value = await itemStore.getStats(model, field);
};

// Fetch data on mount
await fetchData();

// Watch for changes in the itemStore data related to `model` and `field`
watch(
  () => itemStore.stores[model].searchForm, // Watch this part of the store
  async () => {
    await fetchData(); // Fetch the updated data when changes are detected
  },
  { deep: true }
);

// Computed property to process the chart data
const chartData = computed(() => {
  const label = props.label;

  // Process the data into monthly submission counts
  const submissionDatesByMonth: Record<string, number> = Object.keys(data.value)
    .filter((key) => key.includes('-'))
    .reduce((acc: Record<string, number>, key: string) => {
      const [year, month] = key.split('-');
      const date = `${year}-${month}`;
      acc[date] = acc[date] ? acc[date] + data.value[key] : data.value[key];
      return acc;
    }, {});

  // Sort the dates
  const sortedDates = Object.keys(submissionDatesByMonth)
    .sort((a, b) => toDate(a).getTime() - toDate(b).getTime());

  // Create the datasets for the chart
  const datasets = [
    {
      label: label,
      backgroundColor: 'rgba(75,192,192,0.4)',
      data: sortedDates.map((date) => submissionDatesByMonth[date]),
      fill: true,
      pointRadius: 0,
      borderWidth: 2,
      borderColor: colors.getColor("primary"),
    },
  ];

  return {
    labels: sortedDates,
    datasets,
  };
});

// Chart options
const options = {
  scales: {
    x: {
      type: 'category',
    },
    y: {
      display: false,
    },
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
    },
  },
  datasets: {
    line: {
      tension: 0.3,
    },
  },
  maintainAspectRatio: false,
};

// Helper function to convert string date to Date object
function toDate(dateString: string): Date {
  const [year, month] = dateString.split('-').map(Number);
  return new Date(year, month);
}
</script>
