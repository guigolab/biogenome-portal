<template>
  <div class="row row-equal">
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'metadata.assembly_level'"
          :model="'assemblies'"
          :title="'assembly levels'"
          :label="'Assemblies by assembly level'"
        />
      </Suspense>
    </div>
    <div class="flex lg6 md6 sm12 xs12">
      <Suspense>
        <DateLineChart
          :label="'Assemblies'"
          :field="'metadata.submission_date'"
          :title="'Assemblies submitted by month'"
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
          :title="'Submitters'"
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

  const assemblyStore = useAssemblyStore()

  function getSubmitters(value: Contributor[]) {
    assemblyStore.submitters = [...value]
  }
</script>
