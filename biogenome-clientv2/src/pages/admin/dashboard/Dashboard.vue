<template>
  <div class="dashboard">
    <dashboard-info-block />

    <Suspense>
      <dashboard-charts />
    </Suspense>

    <div class="row row-equal">
      <div class="flex xs12 lg6">
        <dashboard-tabs @submit="addAddressToMap" />
      </div>

      <div class="flex xs12 lg6">
        <DashboardMap ref="dashboardMap" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'

  import DashboardCharts from './DashboardCharts.vue'
  import DashboardInfoBlock from './DashboardInfoBlock.vue'
  import DashboardTabs from './DashboardTabs.vue'
  import DashboardMap from './DashboardMap.vue'

  const dashboardMap = ref()

  function addAddressToMap({ city, country }: { city: { text: string }; country: string }) {
    dashboardMap.value.addAddress({ city: city.text, country })
  }
</script>

<style lang="scss">
  .row-equal .flex {
    .va-card {
      height: 100%;
    }
  }

  .dashboard {
    .va-card {
      margin-bottom: 0 !important;
      &__title {
        display: flex;
        justify-content: space-between;
      }
    }
  }
</style>
