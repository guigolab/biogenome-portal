<template>
  <div class="dashboard">
    <DashBoardTitle />
    <va-divider />
    <DashboardModelStats />
    <InfoBlockVue v-if="charts.length" :charts="charts" />
    <div class="row row-equal">
      <div v-if="coordinates.length" style="min-height: 400px;" class="flex lg6 md6 sm12 xs12">
        <LeafletMap :coordinates="coordinates"/>
      </div>
      <div class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <IndentedTreeCard/>
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
import IndentedTreeCard from '../../components/ui/IndentedTreeCard.vue';
import InfoBlockVue from '../../components/InfoBlock.vue'
import { dashboardInfoBlocks } from '../../../config.json'
import DashBoardTitle from './components/DashBoardTitle.vue';
import { InfoBlock, SampleLocations } from '../../data/types';
import GeoLocationService from '../../services/clients/GeoLocationService';
import {onMounted, ref} from 'vue'
import LeafletMap from '../../components/maps/LeafletMap.vue';
const root = import.meta.env.VITE_ROOT_NODE || '131567'

const coordinates = ref<SampleLocations[]>([])
const charts = <InfoBlock[]>dashboardInfoBlocks
onMounted(async()=>{
  const {data} = await GeoLocationService.getLocationsByTaxon(root)
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
