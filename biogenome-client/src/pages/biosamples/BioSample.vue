<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'biosamples' }" :label="t('biosampleList.breadcrumb')" />
    <va-breadcrumbs-item active :label="accession" />
  </va-breadcrumbs>
  <va-divider />
  <va-skeleton v-if="isLoading" height="90vh" />
  <div v-else-if="errorMessage">
    <va-card stripe stripe-color="danger">
      <va-card-content>
        {{ errorMessage }}
      </va-card-content>
    </va-card>
  </div>
  <div v-else>
    <DetailsHeader :details="details" />
    <KeyValueCard v-if="bioSampleSelectedMetadata.length && metadata" :metadata="metadata"
      :selected-metadata="bioSampleSelectedMetadata" />
    <div class="row row-equal">
      <div v-for="(dt, index) in validData" class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <template #default>
            <RelatedDataCard :object-id="accession" :related-data="dt" :callback="'biosample'" :key="index" />
          </template>
          <template #fallback>
            <va-skeleton height="300px" />
          </template>
        </Suspense>
      </div>
      <div v-if="metadata && Object.keys(metadata).length" class="flex lg6 md6 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
      <div v-if="coordinates.length" class="flex lg6 md6 sm12 xs12">
        <LeafletMap :coordinates="coordinates" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import BioSampleService from '../../services/clients/BioSampleService'
import { onMounted, ref, watch } from 'vue'
import RelatedDataCard from '../../components/ui/RelatedDataCard.vue'
import { useI18n } from 'vue-i18n'
import { BioSample, Details, SampleLocations } from '../../data/types'
import { relatedData } from './configs'
import { bioSampleSelectedMetadata } from '../../../config.json'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import KeyValueCard from '../../components/ui/KeyValueCard.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'

const { t } = useI18n()
const props = defineProps<{
  accession: string
}>()
const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
const details = ref<
  Details | any
>()
const metadata = ref<Record<string, any> | null>(null)
const validData = ref<Record<string, string>[]>([])
const coordinates = ref<SampleLocations[]>([])

watch(
  () => props.accession,
  async (value) => {
    await getBioSample(value)
    await getCoordinates(props.accession)
  }
)

onMounted(async () => {
  await getBioSample(props.accession)
  await getCoordinates(props.accession)
})

async function getBioSample(accession: string) {
  try {
    isLoading.value = true
    const { data } = await BioSampleService.getBioSample(accession)
    details.value = { ...parseDetails(data) }
    if (data.metadata) metadata.value = { ...data.metadata }
    const models = relatedData.filter(
      (relatedModel) => Object.keys(data).includes(relatedModel.key) && data[relatedModel.key].length,
    )
    if (models.length) {
      validData.value = [...models]
    } else {
      validData.value = []
    }
  } catch (e) {
    errorMessage.value = e
  } finally {
    isLoading.value = false
  }

}
async function getCoordinates(accession: string) {
  try {
    isLoading.value = true
    const { data } = await GeoLocationService.getLocationsByBioSample(accession)
    coordinates.value = [...data]
  }catch(e){
    console.log(e)
  }finally{
    isLoading.value=false
  }
}

function parseDetails(biosample: BioSample) {
  const accession = biosample.accession
  const details: Details = {
    title: accession,
    button1: {
      route: { name: 'organism', params: { taxid: biosample.taxid } },
      label: biosample.scientific_name
    },
    ncbiPath: `https://www.ncbi.nlm.nih.gov/biosample/${accession}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${accession}`
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
