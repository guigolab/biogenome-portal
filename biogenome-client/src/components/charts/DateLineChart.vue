<template>
  <va-card class="chart-widget">
    <va-card-title>{{ t(title) }}</va-card-title>
    <va-card-content>
      <va-chart class="chart" :options="{scales:{yAxes:{display:false}}}" :data="createLineChartData(data)" type="line" />
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
  import StatisticsService from '../../services/clients/StatisticsService'
  import VaChart from '../../components/va-charts/VaChart.vue'
  import { TLineChartData } from '../../data/types'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const props = defineProps<{
    model: string,
    field: string,
    title: string,
    label?: string,
    color?: string,
  }>()

  const { data } = await StatisticsService.getModelFieldStats(props.model, { field: props.field })
  
  function toDate(dateString: string): Date {
    const [year, month] = dateString.split('-').map(Number);
    return new Date(year, month);
  }
  function createLineChartData(submissionData: Record<string, number>): TLineChartData {
    const submissionDatesByMonth: Record<string, number> = Object.keys(submissionData)
      .filter((key) => key.includes('-'))
      .reduce((acc:Record<string, number>, key:string) => {
        const [year, month] = key.split('-');
        const date = `${year}-${month}`;
        acc[date] = acc[date] ? acc[date]+submissionData[key] : submissionData[key]
        return acc;
      }, {});

    const sortedDates = Object.keys(submissionDatesByMonth)
      .sort((a, b) => toDate(a) > toDate(b) ? 1 : -1);

    const datasets = [
      {
        label: t(props.label) ,
        backgroundColor: props.color,
        data: sortedDates.map((date) => submissionDatesByMonth[date]),
      }
    ];

    return {
      labels: sortedDates,
      datasets,
    };
  }
</script>
