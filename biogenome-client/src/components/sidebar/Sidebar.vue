<template>
  <VaSidebar width="20rem" v-model="itemStore.showFilters">
    <VaCardContent>
      <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <TaxonSearch @taxon-update="handleTaxon" />
        </div>
      </div>
    </VaCardContent>
    <VaCardContent>
      <div class="row justify-space-between">
        <div class="flex">
          <VaButton border-color="primary" @click="taxonomyStore.showTree = !taxonomyStore.showTree"
            :icon="taxonomyStore.showTree ? 'fa-eye-slash' : 'fa-eye'">Show in Tree
          </VaButton>
        </div>
        <div class="flex">
          <VaButton preset="secondary" border-color="primary" icon="fa-code-branch">Eukaryota</VaButton>
        </div>
      </div>
    </VaCardContent>
    <!-- <VaCardActions align="between">
      <VaButton border-color="primary" @click="taxonomyStore.showTree = !taxonomyStore.showTree"
        :icon="taxonomyStore.showTree ? 'fa-eye-slash' : 'fa-eye'">Show in Tree
      </VaButton>
      <VaButton preset="secondary" border-color="primary" icon="fa-code-branch">Eukaryota</VaButton>
    </VaCardActions> -->
    <!-- <div class="layout">
      <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <TaxonSearch @taxon-update="handleTaxon" />
        </div>
      </div>
      <div class="row justify-space-between">
        <div class="flex">

        </div>
        <div class="flex">
        </div>
      </div>
    </div> -->
    <TaxonDetails v-if="parentTaxon" :name="parentTaxon.name" :rank="parentTaxon.rank" :taxid="parentTaxon.taxid" />

    <!-- <section class="layout fluid va-gutter-5" aria-labelledby="filters-heading">
      <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <VaButton block preset="primary" icon="search">Search by Taxonomy</VaButton>
        </div>
      </div>
      <div class="row justify-space-between">
        <div class="flex">
          <VaButton @click="taxonomyStore.showTree = !taxonomyStore.showTree"
            :icon="taxonomyStore.showTree ? 'fa-eye-slash' : 'fa-eye'" color="secondary" preset="primary">Tree
          </VaButton>
        </div>
        <div class="flex">
          <VaButton block icon="fa-code-branch" color="secondary" preset="primary">Eukaryota</VaButton>
        </div>
      </div> -->



    <!-- <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <VaButton block preset="primary" icon="search">Search by Taxonomy</VaButton>
          <TaxonSearchSelect @taxon-update=""/> 
        </div>
        <div style="width: 80%;" class="flex">
          <VaButton icon="search" block color="secondary" preset="primary">
            Filter by taxon
          </VaButton>
        </div>
        <div style="width: 20%;" class="flex">
          <VaButton block icon="fa-code-branch" color="secondary" preset="primary"></VaButton>
        </div>
      </div>
      <div class="row justify-space-between align-end">
        <div class="flex lg12 md12 sm12 xs12">
          <VaIcon :name="iconMap[currenView].icon"></VaIcon>
          <h2 id="filters-heading" class="va-h4">Filters for {{ currenView }}</h2>
        </div>
      </div> -->
    <!-- <FilterForm :model="currenView" /> -->
    <!-- <Taxonomy :model="currenView" />
      <TaxonDetails v-if="itemStore.parentTaxon" :name="itemStore.parentTaxon.name" :rank="itemStore.parentTaxon.rank"
        :taxid="itemStore.parentTaxon.taxid"></TaxonDetails>
      <Data :model="currenView" />
      <ModelFilters :model="currenView" /> -->
    <!-- </section> -->
  </VaSidebar>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useItemStore } from '../../stores/items-store'
import { DataModels, TaxonNode } from '../../data/types'
import { computed } from 'vue'
import { iconMap } from '../../composable/useIconMap'
import Data from '../collapses/Data.vue';
import Taxonomy from '../collapses/Taxonomy.vue';
// import TaxonDetails from '../../sections/TaxonDetails.vue'
import ModelFilters from '../collapses/ModelFilters.vue';
import FilterForm from '../forms/FilterForm.vue';
import TaxonSearchSelect from '../inputs/TaxonSearchSelect.vue'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import TaxonSearch from '../dropdowns/TaxonSearch.vue'
import TaxonSummary from '../blocks/TaxonSummary.vue'

const taxonomyStore = useTaxonomyStore()
// Create an array of valid values
const dataModelValues: DataModels[] = [
  'biosamples',
  'experiments',
  'organisms',
  'annotations',
  'assemblies',
  'local_samples'
]
const router = useRouter()
const itemStore = useItemStore()

const parentTaxon = computed(() => itemStore.parentTaxon)

//default view to organisms
const currenView = computed(() => router.currentRoute.value.name ? router.currentRoute.value.name as DataModels : 'organisms')


const handleTaxon = (taxon: TaxonNode | null) => {
  itemStore.parentTaxon = taxon
}



</script>
<style></style>