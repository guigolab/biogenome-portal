<template>
  <div class="dashboard">
    <PageHeader :title="dashboard.title" :description="dashboard.description" />
    <VaDivider />
    <StatsBlock></StatsBlock>
    <InfoBlockVue v-if="charts.length" :charts="charts" />
    <ExtraInfoBlock />
  </div>
</template>

<script setup lang="ts">
import InfoBlockVue from '../../components/InfoBlock.vue'
import { dashboard } from '../../../config.json'
import { InfoBlock } from '../../data/types';
import StatsBlock from './components/StatsBlock.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import ExtraInfoBlock from './components/ExtraInfoBlock.vue'


const charts = dashboard.charts as InfoBlock[]

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

.chart {
  height: 400px;
}
</style>
