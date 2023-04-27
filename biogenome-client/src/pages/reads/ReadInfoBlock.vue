<template>
  <div class="row row-equal">
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'instrument_platform'"
          :model="'reads'"
          :title="t('experimentList.charts.pieChart.title')"
          :label="t('experimentList.charts.pieChart.label')"
        />
      </Suspense>
    </div>
    <div class="flex lg6 md6 sm12 xs12">
      <Suspense>
        <DateLineChart
          :label="t('experimentList.charts.dateLineChart.label')"
          :field="'metadata.first_public'"
          :title="t('experimentList.charts.dateLineChart.title')"
          :model="'reads'"
          :color="'#2c82e0'"
        />
      </Suspense>
    </div>
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <ContributorList
          :field="'metadata.center_name'"
          :model="'reads'"
          :title="t('experimentList.charts.contributorList')"
          @list-created="getSubmitters"
        />
      </Suspense>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { Contributor } from '../../data/types'
  import DateLineChart from '../../components/charts/DateLineChart.vue'
  import PieChart from '../../components/charts/PieChart.vue'
  import ContributorList from '../../components/stats/ContributorList.vue'
  import { useReadStore } from '../../stores/read-store'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const readStore = useReadStore()

  function getSubmitters(value: Contributor[]) {
    readStore.submitters = [...value]
  }
</script>

<style lang="scss">
  .chart {
    height: 400px;
  }
  .row-equal .flex {
    .va-card {
      height: 100%;
    }
  }
</style>
