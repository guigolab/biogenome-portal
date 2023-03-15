<template>
    <div class="dashboard">
      <DashboardInfoBlock />
        <DashboardCharts />
        <div class="row row-equal">
            <div style="min-height: 400px;" class="flex lg6 md6 sm12 xs12">
                <Suspense>
                    <DashBoardMap/>
                </Suspense>
            </div>
            <div class="flex lg6 md6 sm12 xs12">
                <Suspense>
                    <DashboardTree/>
                </Suspense>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import DashboardInfoBlock from './DashboardInfoBlock.vue';
import DashboardCharts from './DashboardCharts.vue';
import DashBoardMap from './DashBoardMap.vue';
import DashboardTree from './DashboardTree.vue';

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
  .chart{
    height: 400px;
  }
</style>
