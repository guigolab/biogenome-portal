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
          :field="'metadata.GAL'"
          :model="'biosamples'"
          :title="'Genome Aquisition Labs (GAL)'"
        />
      </Suspense>
    </div>
  </div>
</template>

<script setup lang="ts">
  import PieChart from '../../components/charts/PieChart.vue';
  import DateLineChart from '../../components/charts/DateLineChart.vue';
  import ContributorList from '../../components/stats/ContributorList.vue';


</script>

<style>
  .chart {
    height: 400px;
  }
</style>
