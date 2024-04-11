<template>
  <div class="dashboard">
    <DashBoardTitle />
    <va-divider />
    <ModelStats />
    <InfoBlockVue v-if="charts.length" :charts="charts" />
    <div class="row row-equal">
      <div v-if="coordinates.length" class="flex lg6 md6 sm12 xs12 c-h">
        <LeafletMap :coordinates="coordinates" />
      </div>
      <div class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <IndentedTreeCard />
          <template #fallback>
            <va-skeleton height="400px" />
          </template>
        </Suspense>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IndentedTreeCard from '../../components/ui/IndentedTreeCard.vue';
import InfoBlockVue from '../../components/InfoBlock.vue'
import { dashboard } from '../../../config.json'
import DashBoardTitle from './components/DashBoardTitle.vue';
import { InfoBlock, SampleLocations } from '../../data/types';
import GeoLocationService from '../../services/clients/GeoLocationService';
import { onMounted, ref } from 'vue'
import LeafletMap from '../../components/maps/LeafletMap.vue';
import ModelStats from '../../components/ui/ModelStats.vue';
const root = import.meta.env.VITE_ROOT_NODE || '131567'

const coordinates = ref<SampleLocations[]>([])
const charts = <InfoBlock[]>dashboard.charts

onMounted(async () => {
  const { data } = await GeoLocationService.getLocationsByTaxon(root)
  coordinates.value = [...data]
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

.chart {
  height: 400px;
}
</style>
