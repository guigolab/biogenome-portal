<template>
    <div class="dashboard">
      <div class="row align-center">
        <div v-if="navBar.logoName" class="flex">
          <a :href="navBar.url" target="_blank" ><va-icon size="5rem" name=app-logo></va-icon></a>
        </div>
        <div class="flex lg8 md8">
          <h1 class="va-h1">{{ appInfo.title }}</h1>
          <p>{{ appInfo[locale].description }}</p>
        </div>
      </div>
      <va-divider/>
      <DashboardModelStats />
        <InfoBlock :charts="dashboardInfoBlocks"/>
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
import DashboardModelStats from './DashboardModelStats.vue';
import DashBoardMap from './DashBoardMap.vue';
import DashboardTree from './DashboardTree.vue';
import InfoBlock from '../../components/InfoBlock.vue'
import {dashboardInfoBlocks} from '../../../config.json'
import {appInfo,navBar } from '../../../config.json'
import { useI18n } from 'vue-i18n'
const { locale } = useI18n() 

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
