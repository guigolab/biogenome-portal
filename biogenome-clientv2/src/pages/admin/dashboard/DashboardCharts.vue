<template>
  <div class="row row-equal">
    <div class="flex xs12 lg6 xl6">
      <va-card v-if="assemblyPublishedData">
        <va-card-title>
          <h1>Assemblies published per month</h1>
          <div>
            <va-button
              class="ma-1"
              size="small"
              color="danger"
              :disabled="datasetIndex === minIndex"
              @click="setDatasetIndex(datasetIndex - 1)"
            >
              {{ t('dashboard.charts.showInLessDetail') }}
            </va-button>
            <va-button
              class="ma-1"
              size="small"
              color="danger"
              :disabled="datasetIndex === maxIndex - 1"
              @click="setDatasetIndex(datasetIndex + 1)"
            >
              {{ t('dashboard.charts.showInMoreDetail') }}
            </va-button>
          </div>
        </va-card-title>
        <va-card-content>
          <va-chart class="chart" :data="createLineChartData(assemblyPublishedData)" type="line" />
        </va-card-content>
      </va-card>
    </div>

    <div class="flex xs12 sm6 md6 lg3 xl3">
      <va-card class="d-flex">
        <va-card-title>
          <h1>assembly level</h1>
          <va-button icon="print" plain @click="printChart" />
        </va-card-title>
        <va-card-content v-if="assemblyLevelData">
          <va-chart
            ref="doughnutChart"
            class="chart chart--donut"
            :data="createPieChartData(assemblyLevelData)"
            type="doughnut"
          />
        </va-card-content>
      </va-card>
    </div>

    <div class="flex xs12 sm6 md6 lg3 xl3">
      <dashboard-contributors-chart />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { doughnutChartData, lineChartData } from '../../../data/charts'
  import { useChartData } from '../../../data/charts/composables/useChartData'
  import { usePartOfChartData } from './composables/usePartOfChartData'
  import VaChart from '../../../components/va-charts/VaChart.vue'
  import DashboardContributorsChart from './DashboardContributorsList.vue'
  import StatisticsService from '../../../services/clients/StatisticsService'
  import { useColors } from 'vuestic-ui'
  import TLineChartData from '../../../data/types'

  const { t } = useI18n()

  const doughnutChart = ref()
  const dataGenerated = useChartData(lineChartData, 0.7)
  const doughnutChartDataGenerated = useChartData(doughnutChartData)
  console.log(doughnutChartData)
  const assemblyPublishedData = await StatisticsService.getModelFieldStats('assemblies', {
    field: 'metadata.submission_date',
  })
  const assemblyLevelData = await StatisticsService.getModelFieldStats('assemblies', {
    field: 'metadata.assembly_level',
  })
  const primaryColorVariants = ['#2c82e0', '#ef476f', '#ffd166', '#06d6a0', '#8338ec']

  function createLineChartData(data: Record<string, unknown>) {
    const respObject = data.data
    const sortedValues = Object.keys(respObject)
      .map((k) => {
        const values = k.split('-')
        const date = `${values[0]}-${values[1]}`
        return { label: date, value: respObject[k] }
      })
      .sort((a, b) => new Date(a.label) > new Date(b.label))

    const lineChart: TLineChartData = {
      labels: sortedValues.map((v) => v.label),
      datasets: [
        {
          backgroundColor: '#2c82e0',
          data: sortedValues.map((v) => v.value),
        },
      ],
    }
    return lineChart
  }

  function createPieChartData(data: Record<string, unknown>) {
    const respObject = data.data
    return {
      labels: Object.keys(respObject),
      datasets: [
        {
          backgroundColor: primaryColorVariants,
          label: 'Test',
          data: Object.values(respObject),
        },
      ],
    }
  }

  const {
    dataComputed: lineChartDataGenerated,
    minIndex,
    maxIndex,
    datasetIndex,
    setDatasetIndex,
  } = usePartOfChartData(dataGenerated)

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

<style scoped>
  .chart {
    height: 400px;
  }
</style>
