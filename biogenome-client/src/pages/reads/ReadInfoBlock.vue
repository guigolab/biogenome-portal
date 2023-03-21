<template>
  <div class="row row-equal">
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'instrument_platform'"
          :model="'reads'"
          :title="'platform used'"
          :label="'Reads by instrument platform'"
        />
      </Suspense>
    </div>
    <div class="flex lg6 md6 sm12 xs12">
      <Suspense>
        <DateLineChart
          :label="'Reads'"
          :field="'metadata.first_public'"
          :title="'Reads submitted by month'"
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
          :title="'Centers'"
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
