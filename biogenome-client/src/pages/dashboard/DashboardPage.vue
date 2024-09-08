<template>
  <div class="dashboard">
    <PageHeader :title="dashboardInfo.title" :description="dashboardInfo.description" />
    <VaDivider />
    <StatsBlock />
    <ChartsBlock v-if="configCharts.length" :charts="configCharts" />
    <!-- <ExtraInfoBlock /> -->
  </div>
</template>

<script setup lang="ts">
import ChartsBlock from '../../components/blocks/ChartsBlock.vue'
import StatsBlock from '../../components/blocks/StatsBlock.vue'

import pages from '../../../configs/pages.json'
import charts from '../../../configs/charts.json'
import { computed } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'


const dashboardInfo = computed(() => {
  const { title = "Dashboard", description = "" } = pages.dashboard || {};
  return { title, description };
});


const configCharts = computed(() => {
  return charts.dashboard || []
})

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
