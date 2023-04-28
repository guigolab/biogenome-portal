<template>
  <va-card class="d-flex">
    <va-card-title>
      <h1>{{ t(title) }}</h1>
      <va-button icon="print" plain @click="printChart" />
    </va-card-title>
    <va-card-content>
      <va-chart ref="doughnutChart" class="chart chart--donut" :data="createPieChartData(data)" type="doughnut" />
    </va-card-content>
  </va-card>
</template>

<script setup lang="ts">
  import VaChart from '../../components/va-charts/VaChart.vue'
  import StatisticsService from '../../services/clients/StatisticsService'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const props = defineProps({
    model: String,
    field: String,
    title: String,
    label: String,
    query: Object,
  })
  const primaryColorVariants = ['#2c82e0', '#ef476f', '#ffd166', '#06d6a0', '#8338ec']

  const { data } = props.query
    ? await StatisticsService.getModelFieldStats(props.model, { field: props.field, query: props.query })
    : await StatisticsService.getModelFieldStats(props.model, { field: props.field })

  function createPieChartData(data: Record<string, number>) {
    return {
      labels: Object.keys(data),
      datasets: [
        {
          backgroundColor: primaryColorVariants,
          label: t(props.label),
          data: Object.values(data),
        },
      ],
    }
  }

  function printChart() {
    const windowObjectReference = window.open('', 'Print', 'height=600,width=800') as Window

    const img = windowObjectReference.document.createElement('img')

    img.src = `${(document.querySelector('.chart--donut canvas') as HTMLCanvasElement | undefined)?.toDataURL(
      'image/png',
    )}`

    img.onload = () => {
      windowObjectReference?.document.body.appendChild(img)
    }

    windowObjectReference.print()

    windowObjectReference.onafterprint = () => {
      windowObjectReference?.close()
    }
  }
</script>
