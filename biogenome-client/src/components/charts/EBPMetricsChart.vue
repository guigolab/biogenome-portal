<template>
  <Scatter chart-id="ebp-metrics" :chart-data="chartData" :chart-options="opts" />
</template>

<script setup lang="ts">
import { Scatter } from 'vue-chartjs';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useItemStore } from '../../stores/items-store';
import { computed, ref, watch } from 'vue';
import CommonService from '../../services/clients/CommonService';

const itemStore = useItemStore()

watch(
  () => itemStore.stores.assemblies.searchForm, // Watch this part of the store
  async () => {
    await fetchData(); // Fetch the updated data when changes are detected
  },
  { deep: true });
// Ref to hold the data
const assemblies = ref<Record<string, any>[]>([]);
const fields = ['assembly_name', 'metadata.assembly_stats.contig_n50', 'metadata.assembly_stats.scaffold_n50']
const searchForm = computed(() => itemStore.stores.assemblies.searchForm)

// Initial data fetch from the store
const fetchData = async () => {
  const { data } = await CommonService.getItems('/assemblies', { ...searchForm.value, limit: 20000, fields });
  assemblies.value = [...data.data]
};

await fetchData()


const chartData = computed(() => {
  const parsedData = processChartData(assemblies.value)
  return {
    datasets: [
      {
        label: 'Assemblies',
        data: parsedData,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        pointRadius: 5,
      }
    ]
  }
})

function processChartData(data: Record<string, any>[]) {
  return data.map(ass => {
    return { x: ass.metadata.assembly_stats.scaffold_n50, y: ass.metadata.assembly_stats.contig_n50 }
  })
}
// Custom axis thresholds
const contigN50Threshold = 1000000; // 1MB
const scaffoldN50Threshold = 10000000; // 10MB

const opts = {
  scales: {
    x: {
      type: 'linear',
      position: 'bottom',
      title: {
        display: true,
        text: 'Scaffold N50 (MB)'
      },
      ticks: {
        callback: function (value: number) {
          return (value / 1000000) + 'MB'; // Convert to MB
        }
      },
      grid: {
        display: true,
        color: function (context) {
          if (context.tick.value === scaffoldN50Threshold) {
            return 'rgba(255, 99, 132, 0.5)'; // Custom color for 10MB line
          }
          return 'rgba(0, 0, 0, 0.1)';
        },
        lineWidth: function (context) {
          return context.tick.value === scaffoldN50Threshold ? 2 : 1; // Thicker line for 10MB
        }
      }
    },
    y: {
      type: 'linear',
      title: {
        display: true,
        text: 'Contig N50 (MB)'
      },
      ticks: {
        callback: function (value) {
          return (value / 1000000) + 'MB'; // Convert to MB
        }
      },
      grid: {
        display: true,
        color: function (context) {
          if (context.tick.value === contigN50Threshold) {
            return 'rgba(255, 99, 132, 0.5)'; // Custom color for 1MB line
          }
          return 'rgba(0, 0, 0, 0.1)';
        },
        lineWidth: function (context) {
          return context.tick.value === contigN50Threshold ? 2 : 1; // Thicker line for 1MB
        }
      }
    }
  }
}


</script>