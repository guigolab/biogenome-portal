<template>
  <va-card class="chart-widget">
    <va-card-title>{{ t(chart.title[locale]) }}</va-card-title>
    <va-card-content>
      <va-chart class="chart" :options="{ scales: { yAxes: { display: false } } }" :data="createLineChartData(data)"
        type="line" />
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
import StatisticsService from '../../services/clients/StatisticsService'
import VaChart from '../../components/va-charts/VaChart.vue'
import { InfoBlock, TLineChartData } from '../../data/types'
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()

const props = defineProps<{
  chart: InfoBlock,
}>()

const { data } = await StatisticsService.getModelFieldStats(props.chart.model,  props.chart.field )

function toDate(dateString: string): Date {
  const [year, month] = dateString.split('-').map(Number);
  return new Date(year, month);
}
function createLineChartData(submissionData: Record<string, number>): TLineChartData {
  const submissionDatesByMonth: Record<string, number> = Object.keys(submissionData)
    .filter((key) => key.includes('-'))
    .reduce((acc: Record<string, number>, key: string) => {
      const [year, month] = key.split('-');
      const date = `${year}-${month}`;
      acc[date] = acc[date] ? acc[date] + submissionData[key] : submissionData[key]
      return acc;
    }, {});

  const sortedDates = Object.keys(submissionDatesByMonth)
    .sort((a, b) => toDate(a).getTime() - toDate(b).getTime());

  const datasets = [
    {
      label: t(props.chart.label[locale.value]),
      backgroundColor: "#2c82e0",
      data: sortedDates.map((date) => submissionDatesByMonth[date]),
    }
  ];

  return {
    labels: sortedDates,
    datasets,
  };
}
</script>
