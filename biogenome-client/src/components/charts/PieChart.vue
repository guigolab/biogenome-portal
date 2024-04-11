<template>
  <va-card>
    <va-card-title>
      <div class="row align-center justify-space-between">
        <div class="flex">
          <h1>{{ t(chart.title[locale]) }}</h1>
        </div>
        <div class="flex">
          <va-button icon="print" plain @click="printChart" />
        </div>
      </div>
    </va-card-title>
    <va-card-content>
      <va-chart ref="doughnutChart" class="chart chart--donut" :data="createPieChartData(data)" type="doughnut" />
    </va-card-content>
  </va-card>
</template>

<script setup lang="ts">
import VaChart from '../../components/va-charts/VaChart.vue'
import { InfoBlock } from '../../data/types'
import StatisticsService from '../../services/clients/StatisticsService'
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()

const props = defineProps<{
  chart: InfoBlock,
}>()

const colors = ['#2c82e0', '#ef476f', '#ffd166', '#06d6a0', '#8338ec', '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#c9cbcf', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
  '#e67e22', '#1abc9c', '#9b59b6', '#34495e', '#95a5a6', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#f39c12',
  '#d35400', '#2c3e50', '#bdc3c7', '#7f8c8d', '#e74c3c', '#2980b9', '#f1c40f', '#2ecc71', '#9b59b6'
]

const { data } = await StatisticsService.getModelFieldStats(props.chart.model, props.chart.field)

function createPieChartData(data: Record<string, number>) {
  return {
    labels: Object.keys(data),
    datasets: [
      {
        backgroundColor: colors,
        label: t(props.chart.label[locale.value]),
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
