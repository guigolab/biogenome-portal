<template>
  <Line :chart-id="chartId" :chart-data="chartData" :chart-options="options" />
</template>

<script async setup lang="ts">
import StatisticsService from '../../services/clients/StatisticsService'
import { InfoBlock } from '../../data/types'
import { Line } from 'vue-chartjs'
import { useColors } from 'vuestic-ui'
import { computed } from 'vue'

const props = defineProps<{
  infoBlock: InfoBlock,
  label: string
  chartId:string
}>()

const colors = useColors()

const { data } = await StatisticsService.getModelFieldStats(props.infoBlock.model, props.infoBlock.field)

const chartData = computed(() => {
  const label = props.label
  const submissionDatesByMonth: Record<string, number> = Object.keys(data)
    .filter((key) => key.includes('-'))
    .reduce((acc: Record<string, number>, key: string) => {
      const [year, month] = key.split('-');
      const date = `${year}-${month}`;
      acc[date] = acc[date] ? acc[date] + data[key] : data[key]
      return acc;
    }, {});

  const sortedDates = Object.keys(submissionDatesByMonth)
    .sort((a, b) => toDate(a).getTime() - toDate(b).getTime())

  const datasets = [
    {
      label: label,
      backgroundColor: 'rgba(75,192,192,0.4)',
      data: sortedDates.map((date) => submissionDatesByMonth[date]),
      fill: true,
      pointRadius: 0,
      borderWidth: 2,
      borderColor: colors.getColor("primary")
    }
  ];
  return {
    labels: sortedDates,
    datasets,
  };
})


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
}

function toDate(dateString: string): Date {
  const [year, month] = dateString.split('-').map(Number);
  return new Date(year, month);
}

</script>