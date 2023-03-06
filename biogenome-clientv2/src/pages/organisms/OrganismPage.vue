<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'organisms' }" label="organisms" />
    </va-breadcrumbs>
    <va-divider />
    <div class="row row-equal">
      <!-- <IndentedTree/> -->

      <!-- <div class="flex lg4 md4">
        <va-card>
          <va-card-title>
            Phylogenetic tree
          </va-card-title>
          <va-card-content style="overflow: scroll;max-height: 100vh;" >
          </va-card-content>
        </va-card>
      </div> -->
      <div class="flex lg12 md12">
        <OrganismListBlock />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import OrganismListBlock from './OrganismListBlock.vue'
  import TreeDiagram from './TreeDiagram.vue'
  import IndentedTree from './IndentedTree.vue'
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
