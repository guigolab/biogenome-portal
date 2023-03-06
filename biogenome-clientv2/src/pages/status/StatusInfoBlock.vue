<template>
  <div class="row row-equal">
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'insdc_status'"
          :model="'organisms'"
          :title="'INSDC Submission status'"
          :label="'INSDC Submission status'"
        />
      </Suspense>
    </div>
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'goat_status'"
          :model="'organisms'"
          :title="'GoaT Submission status'"
          :label="'GoaT Submission status'"
        />
      </Suspense>
    </div>
  </div>
</template>
<script setup lang="ts">
  import PieChart from '../../components/charts/PieChart.vue'
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
