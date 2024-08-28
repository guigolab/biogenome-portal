<template>
  <div class="dashboard">
    <PageHeader :title="dashboard.title" :description="dashboard.description" />
    <VaDivider />
    <AppStats/>
    <ChartsBlock v-if="charts.length" :charts="charts" />
    <!-- <ExtraInfoBlock /> -->
  </div>
</template>

<script setup lang="ts">
import ChartsBlock from '../../components/common/ChartsBlock.vue'
import { dashboard } from '../../../config.json'
import { InfoBlock } from '../../data/types';
import AppStats from '../../components/ui/AppStats.vue'
import PageHeader from '../../components/common/PageHeader.vue'


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
</style>
