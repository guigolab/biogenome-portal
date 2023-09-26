<template>
  <div class="dashboard">
    <DashBoardTitle />
    <va-divider />
    <DashboardModelStats />
    <InfoBlockVue :charts="charts" />
    <div class="row row-equal">
      <div style="min-height: 400px;" class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <DashBoardMap />
          <template #fallback>
            <va-skeleton height="400px" />
          </template>
        </Suspense>
      </div>
      <div class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <DashboardTree />
          <template #fallback>
            <va-skeleton height="400px" />
          </template>
        </Suspense>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DashboardModelStats from './components/DashboardModelStats.vue';
import DashBoardMap from './components/DashBoardMap.vue';
import DashboardTree from './components/DashboardTree.vue';
import InfoBlockVue from '../../components/InfoBlock.vue'
import { dashboardInfoBlocks } from '../../../config.json'
import DashBoardTitle from './components/DashBoardTitle.vue';
import { InfoBlock } from '../../data/types';


const charts = dashboardInfoBlocks as InfoBlock[]

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
