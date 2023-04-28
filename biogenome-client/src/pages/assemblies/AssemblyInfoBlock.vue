<template>
  <div class="row row-equal">
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'metadata.assembly_level'"
          :model="'assemblies'"
          :title="'assemblyList.charts.pieChart.title'"
          :label="'assemblyList.charts.pieChart.title'"
        />
      </Suspense>
    </div>
    <div class="flex lg6 md6 sm12 xs12">
      <Suspense>
        <DateLineChart
          :label="'assemblyList.charts.dateLineChart.label'"
          :field="'metadata.submission_date'"
          :title="'assemblyList.charts.dateLineChart.title'"
          :model="'assemblies'"
          :color="'#2c82e0'"
        />
      </Suspense>
    </div>
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <ContributorList
          :field="'metadata.submitter'"
          :model="'assemblies'"
          :title="t('assemblyList.charts.contributorList.title')"
          @list-created="getSubmitters"
        />
      </Suspense>
    </div>
  </div>
</template>
<script setup lang="ts">
  import DateLineChart from '../../components/charts/DateLineChart.vue'
  import ContributorList from '../../components/stats/ContributorList.vue'
  import PieChart from '../../components/charts/PieChart.vue'
  import { useAssemblyStore } from '../../stores/assembly-store'
  import { Contributor } from '../../data/types'
  import { useI18n } from 'vue-i18n'
  
  const { t } = useI18n()
  const assemblyStore = useAssemblyStore()

  function getSubmitters(value: Contributor[]) {
    assemblyStore.submitters = [...value]
  }
</script>
