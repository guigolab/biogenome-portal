<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'taxons' }" :label="t('taxonDetails.breadcrumb')" />
    <va-breadcrumbs-item
      active
      :label="router.currentRoute.value.params.taxid"
    />
  </va-breadcrumbs>
  <va-divider />
  <div id="top-container" v-if="showData">
    <div class="row row-equal justify-space-between">
      <div class="flex">
        <h1 class="va-h1">{{ taxon.name }}</h1>
        <p>{{ taxon.rank }}</p>
      </div>
      <div class="flex">
        <div class="row row-equal align-center">
          <div class="flex">
            <a target="_blank" :href="`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${taxon.taxid}`">
              <va-avatar size="large">
                <img :src="'/ncbi.png'" />
              </va-avatar>
            </a>
          </div>
          <div class="flex">
            <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${taxon.taxid}`">
              <va-avatar size="large">
                <img :src="'/ena.jpeg'" />
              </va-avatar>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="row row-equal">
      <div class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <PieChart
            :field="'insdc_status'"
            :model="'organisms'"
            :title="'taxonDetails.pieChart'"
            :label="'taxonDetails.pieChart'"
            :query="{ taxon_lineage: props.taxid }"
          />
        </Suspense>
      </div>
      <div class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <TreeCard :taxid="taxid"/>
        </Suspense>
      </div>
      <div v-if="coordinates.length" class="flex lg6 md6 sm12 xs12">
        <LeafletMap style="height: 100%" :coordinates="coordinates" />
      </div>
      <div class="flex lg6 md6 sm12 xs12">
        <TaxonDetailsListBlock :taxid="taxid"/>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { AxiosResponse } from 'axios'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import PieChart from '../../components/charts/PieChart.vue'
import TaxonService from '../../services/clients/TaxonService'
import TreeCard from './TreeCard.vue'
import TaxonDetailsListBlock from './TaxonDetailsListBlock.vue'
import { useI18n } from 'vue-i18n'
import {useRouter} from 'vue-router'

const router = useRouter()
const { t } = useI18n()

const counter = ref(0)

const showData = ref(false)
const error = ref('')
const props = defineProps({
  taxid: String,
})
const coordinates = ref([])
const children = ref([])

const taxon = ref({})

onMounted(async () => {
  await getTaxonInfo(props.taxid)
})

function getTaxon({ data }: AxiosResponse) {
  taxon.value = { ...data }
}
function getCoordinates({ data }: AxiosResponse) {
  coordinates.value = []
  data.forEach((organism) => {
    organism.locations.forEach((location) => {
      const lng = location[0]
      const lat = location[1]
      const value = {
        latitude: Number(lat),
        longitude: Number(lng),
        id: organism.scientific_name,
        taxid: organism.taxid,
      }
      if (organism.image) {
        value.image = organism.image
      }
      coordinates.value.push(value)
    })
  })
}
async function getTaxonInfo(taxid: string) {
  try {
    getTaxon(await TaxonService.getTaxon(taxid))
    getCoordinates(await TaxonService.getTaxonCoordinates(taxid))
    showData.value = true
  } catch (e) {
    if (e && e.response && e.response.data) error.value = taxid + ' ' + e.response.data.message
    showData.value = false
  }
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

.list__item + .list__item {
  margin-top: 10px;
}
</style>
  