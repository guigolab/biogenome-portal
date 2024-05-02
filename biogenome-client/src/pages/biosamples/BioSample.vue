<template>
  <div :key="props.accession">
    <DetailsHeader :details="details" />
    <VaTabs>
      <template #tabs>
        <VaTab label="Metadata" name="metadata"></VaTab>
        <VaTab v-if="assemblies.length" label="Related Assemblies" name="assemblies"></VaTab>
        <VaTab v-if="experiments.length" label="Related Experiments" name="experiments"></VaTab>
        <VaTab v-if="subSamples.length" label="Related Samples" name="experiments"></VaTab>
        <VaTab v-if="coordinates.length" label="Map" name="map"></VaTab>
      </template>
    </VaTabs>
    <VaDivider></VaDivider>
    <div v-if="['assemblies', 'experiments', 'sub_samples'].includes(tab)" class="row">
      <div :key="tab" class="flex lg12 md12 sm12 xs12">
        <VaDataTable :items="currentTable?.items" :columns="currentTable?.columns"></VaDataTable>
      </div>
    </div>
    <div class="row" v-else-if="tab === 'map'">
      <div class="flex lg12 md12 sm12 xs12">
        <LeafletMap :coordinates="coordinates"/>
      </div>
    </div>
    <div class="row" v-else>
      <div v-if="metadata && Object.keys(metadata).length" class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import BioSampleService from '../../services/clients/BioSampleService'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BioSample, Details, SampleLocations } from '../../data/types'
import { models } from '../../../config.json'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
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
const tab = ref('metadata')
const metadata = ref<Record<string, any> | null>(null)
const coordinates = ref<SampleLocations[]>([])
const assemblies = ref<Record<string, any>[]>([])
const experiments = ref<Record<string, any>[]>([])
const subSamples = ref<Record<string, any>[]>([])

watch(
  () => props.accession,
  async (value) => {
    await getData(value)
  }
)

const currentTable = computed(() => {
  if (tab.value === 'assemblies') {
    return { items: assemblies.value, columns: models.assemblies.columns }
  } else if (tab.value === 'experiments') {
    return { items: experiments.value, columns: models.experiments.columns }
  }
  else if (tab.value === 'sub_samples') {
    return { items: subSamples.value, columns: models.biosamples.columns }
  }
})

onMounted(async () => {
  await getData(props.accession)
})

async function getData(accession: string) {
  await getBioSample(accession)
  await getCoordinates(accession)
  assemblies.value = [...await getRelatedData(accession, 'assemblies')]
  experiments.value = [...await getRelatedData(accession, 'experiments')]
  subSamples.value = [...await getRelatedData(accession, 'sub_samples')]
}

async function getRelatedData(accession: string, model: 'experiments' | 'sub_samples' | 'assemblies') {
  const { data } = await BioSampleService.getBioSampleRelatedData(accession, model)
  return data
}

async function getBioSample(accession: string) {
  try {
    isLoading.value = true
    const { data } = await BioSampleService.getBioSample(accession)
    details.value = { ...parseDetails(data) }
    if (data.metadata) metadata.value = { ...data.metadata }
  } catch (e) {
    errorMessage.value = e
  } finally {
    isLoading.value = false
  }

}
async function getCoordinates(accession: string) {
  const { data } = await GeoLocationService.getLocationsByBioSample(accession)
  coordinates.value = [data]
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
