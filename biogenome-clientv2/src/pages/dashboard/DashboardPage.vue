<template>
    <div class="dashboard">
      <DashboardInfoBlock />
  
        <DashboardCharts />
        <div class="row row-equal">
            <div class="flex lg6 md6 sm12 xs12">
                <Suspense>
                    <DashBoardMap/>
                </Suspense>
            </div>
            <div v-if="showTree" class="flex lg6 md6 sm12 xs12">
                <va-card>
                    <va-card-title>
                        phylogenetic tree
                    </va-card-title>
                    <va-card-content style="overflow: scroll;">
                        <TreeOfLife :data="treeData"/>
                    </va-card-content>
                </va-card>
            </div>
        </div>

<!--   
      <div class="row row-equal">
        <div class="flex xs12 lg6">
          <dashboard-tabs @submit="addAddressToMap" />
        </div>
  
        <div class="flex xs12 lg6">
          <DashboardMap ref="dashboardMap" />
        </div>
      </div> -->
    </div>
        <!-- 
        all stats
        organisms map
        top ranks
        insdc status
        goat status

     -->
</template>

<script setup lang="ts">
import DashboardInfoBlock from './DashboardInfoBlock.vue';
import DashboardCharts from './DashboardCharts.vue';
import OrganismService from '../../services/clients/OrganismService';
import DashBoardMap from './DashBoardMap.vue';
import TreeOfLife from '../../components/TreeOfLife.vue';
import { onMounted, ref } from 'vue';
import TaxonService from '../../services/clients/TaxonService';


const showTree = ref(false)
const treeData = ref({})
onMounted(async () => {
    getTreeData('2759')
  })

  async function getTreeData(taxid: string) {
    showTree.value = false
    const { data } = await TaxonService.getTree(taxid, { limit: 166 })
    treeData.value = {...data}
    showTree.value = true
    return data
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
