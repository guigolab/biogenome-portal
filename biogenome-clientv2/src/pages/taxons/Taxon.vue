<template>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'taxons' }" label="taxonomy" />
    </va-breadcrumbs>
    <va-divider />
  <!-- <div class="row row-equal">
    <div style="height:100vh" class="flex lg12 md12 sm12 xs12">
      <TreeMap/>
    </div>
  </div> -->
  <!-- 
    contributor list by class
    
   -->
  <div class="row row-equal">
    <!-- <div class="flex lg3 md3 sm12 xs12">
      <va-card>
        <va-card-title>assemblies published by kingdom</va-card-title>
        <va-card-content>
          <va-chart style="height: 350px" :data="chartData" type="doughnut" />
        </va-card-content>
      </va-card>
    </div> -->
    <!-- <div v-if="contributorGroups?.length" class="flex lg3 md3 sm12 xs12">
      <div class="row align-center justify-space-between">
        <div v-for="rank in ranks" :key="rank" class="flex">
          <va-chip :outline="selectedRank !== rank" @click="getGroup(rank)">{{ rank }}</va-chip>
        </div>
      </div>
      <ContributorList
        :key="counter"
        :loading="loading"
        :title="`organisms by ${selectedRank}`"
        :data-type="'Organisms'"
        :contributors="contributorGroups"
      />
    </div> -->
    <!-- <div class="flex lg6 md6" style="overflow: scroll;">
        <IndentedTree/>
    </div> -->
    <div class="flex lg6 md6 sm12 xs12">
      <Taxonomy @generate-tree="getTreeData" />
    </div>
    <Transition>
      <div v-if="showTree" class="flex lg6 md6 sm12 xs12">
        <TreeOfLife :data="treeData" @to-organism-list="toOrganismList" @update-tree="getTreeData" />
      </div>
    </Transition>
  </div>
</template>
<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import TaxonService from '../../services/clients/TaxonService'
  import TreeOfLife from '../../components/TreeOfLife.vue'
  import { TaxonNode, Contributor } from '../../data/types'
  import Taxonomy from './Taxonomy.vue'
  import { useOrganismStore } from '../../stores/organism-store'
  import { useRouter } from 'vue-router'
  import route from '../admin/ui/route'
  import TreeMap from './TreeMap.vue'
  import IndentedTree from '../organisms/IndentedTree.vue'
  const organismStore = useOrganismStore()
  const router = useRouter()

  const ranks = ['class', 'phylum', 'order', 'family']
  const selectedRank = ref('class')
  const contributorGroups = ref<Contributor[]>()
  const chartData = ref({})
  const counter = ref(0)
  const loading = ref(false)
  const showTree = ref(false)
  const treeData = ref({})

  onMounted(async () => {
    // await generateChartData()
    // await getGroup(ranks[0])
    getTreeData('2759')
  })

  async function getTreeData(taxid: string) {
    showTree.value = false
    const { data } = await TaxonService.getTree(taxid, { limit: 166 })
    treeData.value = data
    showTree.value = true
    return data
  }

  function toOrganismList(taxid: string) {
    organismStore.resetSearchForm()
    organismStore.searchForm.parent_taxid = taxid
    router.push({ name: 'organism-list' })
  }
  // async function generateChartData() {
  //   const { data } = await TaxonService.getTaxons({ rank: 'kingdom' })
  //   const sortedData = await data.data.sort((a: TaxonNode, b: TaxonNode) => b.leaves - a.leaves)
  //   const mappedTaxons = await Promise.all(
  //     sortedData.map((taxon: TaxonNode) => {
  //       return OrganismService.getOrganisms({ parent_taxid: taxon.taxid }).then(({ data }) => {
  //         return { ...taxon, ...data }
  //       })
  //     }),
  //   )
  //   chartData.value = {
  //     labels: mappedTaxons.map((taxon: TaxonNode) => taxon.name),
  //     datasets: [
  //       {
  //         label: 'organisms by kingdom',
  //         backgroundColor: primaryColorVariants,
  //         data: mappedTaxons.map((taxon: TaxonNode) => taxon.assemblies),
  //       },
  //     ],
  //   }
  // }

  // async function getGroup(rank: string) {
  //   loading.value = true
  //   selectedRank.value = rank
  //   const { data } = await TaxonService.searchTaxon({ rank: selectedRank.value })
  //   contributorGroups.value = await data
  //     .sort((a: TaxonNode, b: TaxonNode) => b.leaves - a.leaves)
  //     .map((taxon: TaxonNode) => {
  //       return {
  //         name: taxon.name,
  //         contributions: taxon.leaves,
  //       }
  //     })
  //   loading.value = false
  //   counter.value++
  // }
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
