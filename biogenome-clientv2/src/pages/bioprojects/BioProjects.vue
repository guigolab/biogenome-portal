<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active label="bioprojects" />
    </va-breadcrumbs>
    <va-divider/>
    <div class="row row-equal">

      <div class="flex lg12 md12 sm12 xs12">
        <!-- <BioProjectsListBlock /> -->
        <Tree :nodes="nodes" :expanded-nodes="expandedNodes" @update:expanded="updateExpanded" :track-by="'accession'"/>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted,ref } from 'vue';
import Tree from '../../components/tree/Tree.vue';
import BioProjectService from '../../services/clients/BioProjectService';

const rootProject = import.meta.env.VITE_PROJECT_ACCESSION? import.meta.env.VITE_PROJECT_ACCESSION:'PRJEB49670'
const nodes = ref([])
const expandedNodes = ref([])
onMounted(async() => {
  const {data} = await BioProjectService.getBioprojectChildren(rootProject)
  nodes.value = [...data]
})

function updateExpanded(value){
  console.log(value)
}

</script>

<style lang="scss">
  .chart {
    height: 400px;
  }
  .row-equal .flex {
    .va-card {
      height: 100%;
    }
  }
</style>
