<template>
  <div class="dashboard">
    <PageHeader :title="(dashboardInfo.title as LangOption)" :description="(dashboardInfo.description as LangOption)" />
    <StatsBlock />
    <ChartsBlock v-if="configCharts.length" :charts="configCharts" />
  </div>
</template>

<script setup lang="ts">
import ChartsBlock from '../../components/blocks/ChartsBlock.vue'
import StatsBlock from '../../components/blocks/StatsBlock.vue'
import { InfoBlock, LangOption } from '../../data/types'
import pages from '../../../configs/pages.json'
import charts from '../../../configs/charts.json'
import { computed } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'


const dashboardInfo = computed(() => {
  const { title = "Dashboard", description = "" } = pages.dashboard || {};
  return { title, description };
});


const configCharts = computed(() => {
  const dashCharts = charts.dashboard ? charts.dashboard as InfoBlock[] : []
  return dashCharts
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
