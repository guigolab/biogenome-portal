<template>
  <div class="row row-equal">
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'instrument_platform'"
          :model="'reads'"
          :title="t('dashboard.charts.firstPiechart.title')"
          :label="t('dashboard.charts.firstPiechart.label')"
        />
      </Suspense>
    </div>
    <div class="flex lg6 md6 sm12 xs12">
      <Suspense>
        <DateLineChart
          :label="t('dashboard.charts.dateLineChart.label')"
          :field="'metadata.submission_date'"
          :title="t('dashboard.charts.dateLineChart.title')"
          :model="'assemblies'"
          :color="'#2c82e0'"
        />
      </Suspense>
    </div>
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'insdc_status'"
          :model="'organisms'"
          :title="t('dashboard.charts.secondPiechart.title')"
          :label="t('dashboard.charts.secondPiechart.label')"
        />
      </Suspense>
    </div>
  </div>
</template>

<script setup lang="ts">
  import PieChart from '../../components/charts/PieChart.vue';
  import DateLineChart from '../../components/charts/DateLineChart.vue';
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

</script>

<style>
  .chart {
    height: 400px;
  }
</style>
