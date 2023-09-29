<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'taxons' }" :label="t('taxonDetails.breadcrumb')" />
    <va-breadcrumbs-item active :label="taxid" />
  </va-breadcrumbs>
  <va-divider />
  <Transition>
    <DetailsHeader v-if="details" :details="details" />
  </Transition>
  <va-tabs v-model="tabValue" grow>
    <template #tabs>
      <va-tab v-for="tab in tabs" :key="tab.title" :name="tab.title">
        <va-icon class="mr-2" :name="tab.icon">
        </va-icon>
        {{ t(tab.title) }}
      </va-tab>
    </template>
  </va-tabs>
  <div id="top-container" v-if="showData">
    <div class="row row-equal">
      <div class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <PieChart :field="'insdc_status'" :model="'organisms'" :title="'taxonDetails.pieChart'"
            :label="'taxonDetails.pieChart'" :query="{ taxon_lineage: props.taxid }" />
        </Suspense>
      </div>
      <div class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <TreeCard :taxid="taxid" />
        </Suspense>
      </div>
      <div v-if="coordinates.length" class="flex lg6 md6 sm12 xs12">
        <LeafletMap style="height: 100%" :coordinates="coordinates" />
      </div>
      <div class="flex lg6 md6 sm12 xs12">
        <TaxonDetailsListBlock :taxid="taxid" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import PieChart from '../../components/charts/PieChart.vue'
import TaxonService from '../../services/clients/TaxonService'
import TreeCard from './TreeCard.vue'
import TaxonDetailsListBlock from './TaxonDetailsListBlock.vue'
import { useI18n } from 'vue-i18n'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import { Details, OrganismCoordinates, OrganismLocations, TaxonNode } from '../../data/types'

const { t } = useI18n()

const counter = ref(0)
const details = ref<
  Details | any
>()
const showData = ref(false)
const props = defineProps<{
  taxid: string
}>()
const coordinates = ref([])
const taxon = ref<TaxonNode | any>({})
const isLoading = ref(false)
/*
  get taxon
  get phylogenetic tree
  get coordinates
  get list
*/


onMounted(async () => {
  getTaxon()
  parseDetails(taxon.value)
  getCoordinates(props.taxid)
})

async function getTaxon() {
  const { data } = await TaxonService.getTaxon(props.taxid)
  taxon.value = { ...data }

}
async function getCoordinates(taxid: string) {
  const { data } = await TaxonService.getTaxonCoordinates(taxid)
  coordinates.value = data.reduce((accumulator: OrganismCoordinates[], organism: OrganismLocations) => {
    const tuples: OrganismCoordinates[] = organism.locations.map((location) => {
      return {
        latitude: Number(location[0]),
        longitude: Number(location[1]),
        id: organism.scientific_name,
        taxid: organism.taxid,
        image: organism.image || undefined
      }
    })
    return accumulator.concat(tuples);
  }, []);
}
function parseDetails(taxon: TaxonNode) {
  const details: Details = {
    title: taxon.name,
    ncbiPath: `https://www.ncbi.nlm.nih.gov/assembly/${taxon.taxid}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${taxon.taxid}`
  }
  return details
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

.va-card {
  margin-bottom: 0 !important;

  &__title {
    display: flex;
    justify-content: space-between;
  }
}

.list__item+.list__item {
  margin-top: 10px;
}
</style>
  