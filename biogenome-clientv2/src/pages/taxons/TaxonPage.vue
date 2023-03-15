<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'taxons' }" label="taxonomy" />
    </va-breadcrumbs>
    <div>

    </div>
    <va-divider />
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <RelatedTaxon/>
    </div>
    <div class="flex lg4 md4 sm12 xs12">

      <Taxonomy @generate-tree="getTreeData" @emit-ranks="getRanks"/>
    </div>
    <div class="flex lg8 md8 sm12 xs12">
      <TaxonListBlock/>
    </div>

    <Transition>
      <div v-if="showTree" class="flex lg6 md6 sm12 xs12">
        <TreeOfLife :data="treeData" @update-tree="getTreeData" />
      </div>
    </Transition>
    <!-- 
      taxon query closer species insdc status
      indented tree
      radial tree
      taxon list
      taxon by top ranks



     -->
  </div>
</div>
</template>
<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import TaxonService from '../../services/clients/TaxonService'
  import TreeOfLife from '../../components/TreeOfLife.vue'
  import Taxonomy from './Taxonomy.vue'
  import IndentedTree from '../organisms/IndentedTree.vue'
  import TaxonListBlock from './TaxonListBlock.vue'
  import RelatedTaxon from './RelatedTaxon.vue'
  const showTree = ref(false)
  const treeData = ref({})

  onMounted(async () => {
    getTreeData('2759')
  })

  async function getTreeData(taxid: string) {
    showTree.value = false
    const { data } = await TaxonService.getTree(taxid, { limit: 166 })
    treeData.value = data
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

  .va-card {
    margin-bottom: 0 !important;
    &__title {
      display: flex;
      justify-content: space-between;
    }
  }
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.5s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
</style>
