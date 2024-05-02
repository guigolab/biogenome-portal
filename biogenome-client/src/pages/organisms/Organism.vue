<template>
  <div :key="props.taxid">
    <DetailsHeader :details="details" />
    <VaTabs>
      <template #tabs>
        <VaTab label="Metadata" name="metadata"></VaTab>
        <VaTab v-if="assemblies.length" label="Related Assemblies" name="assemblies"></VaTab>
        <VaTab v-if="experiments.length" label="Related Experiments" name="experiments"></VaTab>
        <VaTab v-if="biosamples.length" label="Related BioSamples" name="biosamples"></VaTab>
        <VaTab v-if="localSamples.length" label="Related Local Samples" name="local_samples"></VaTab>
        <VaTab v-if="annotations.length" label="Related Annotations" name="annotations"></VaTab>
        <VaTab v-if="images.length" label="Related Images" name="images"></VaTab>
        <VaTab v-if="commonNames.length" label="Related Names" name="names"></VaTab>
        <VaTab v-if="publications.length" label="Related Publications" name="publications"></VaTab>
        <VaTab v-if="coordinates.length" label="Map" name="map"></VaTab>
      </template>
    </VaTabs>
    <VaDivider></VaDivider>
    <div v-if="['assemblies', 'experiments', 'biosamples', 'annotations', 'local_samples'].includes(tab)" class="row">
      <div :key="tab" class="flex lg12 md12 sm12 xs12">
        <VaDataTable :items="currentTable?.items" :columns="currentTable?.columns"></VaDataTable>
      </div>
    </div>
    <div class="row" v-else-if="tab === 'map'">
      <div class="flex lg12 md12 sm12 xs12">
        <LeafletMap :coordinates="coordinates" />
      </div>
    </div>
    <div class="row" v-else-if="tab === 'images'">
      <div class="flex lg12 md12 sm12 xs12">
        <Images :images="images" />
      </div>
    </div>
    <div class="row" v-else-if="tab === 'names'">
      <div class="flex lg12 md12 sm12 xs12">
        <VernacularNames :names="commonNames" />
      </div>
    </div>
    <div class="row" v-else-if="tab === 'publications'">
      <div class="flex lg12 md12 sm12 xs12">
        <Publications :publications="publications" />
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
import OrganismService from '../../services/clients/OrganismService'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Details, SampleLocations } from '../../data/types'
import Publications from './components/Publications.vue'
import VernacularNames from './components/VernacularNames.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Images from './components/Images.vue'
import {models} from '../../../config.json'
const { t } = useI18n()
const props = defineProps<{
  taxid: string
}>()
const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
const details = ref<
  Details | any
>()

const tab = ref('metadata')

const metadata = ref<Record<string, any> | null>(null)
const commonNames = ref<Record<string, string>[]>([])
const publications = ref<Record<string, string>[]>([])
const images = ref<string[]>([])
const coordinates = ref<SampleLocations[]>([])
const assemblies = ref<Record<string, any>[]>([])
const biosamples = ref<Record<string, any>[]>([])
const experiments = ref<Record<string, any>[]>([])
const localSamples = ref<Record<string, any>[]>([])
const annotations = ref<Record<string, any>[]>([])


onMounted(async () => {
  await getData(props.taxid)
})

watch(
  () => props.taxid,
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
  else if (tab.value === 'local_samples') {
    return { items: localSamples.value, columns: models.local_samples.columns }
  }
  else if (tab.value === 'annotations') {
    return { items: annotations.value, columns: models.annotations.columns }
  }
  else if (tab.value === 'biosamples') {
    return { items: biosamples.value, columns: models.biosamples.columns }
  }
})

async function getOrganism(taxid:string){
  try {
    isLoading.value = true
    const { data } = await OrganismService.getOrganism(props.taxid)
    details.value = parseDetails(data)
    if (data.metadata) metadata.value = data.metadata

    if (data.publications) publications.value = data.publications

    if (data.image_urls) images.value = data.image_urls

    if (data.common_names) commonNames.value = data.common_names

  } catch (e) {
    errorMessage.value = e
  } finally {
    isLoading.value = false
  }
}

function parseDetails(organism: Record<string, any>) {
  const details: Details = {
    title: organism.scientific_name,
    ncbiPath: `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${organism.taxid}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${organism.taxid}`
  }
  return details
}

async function getData(taxid: string) {
  await getOrganism(taxid)
  await getCoordinates(taxid)
  assemblies.value = [...await getRelatedData(taxid, 'assemblies')]
  experiments.value = [...await getRelatedData(taxid, 'experiments')]
  localSamples.value = [...await getRelatedData(taxid, 'local_samples')]
  biosamples.value = [...await getRelatedData(taxid, 'biosamples')]
  annotations.value = [...await getRelatedData(taxid, 'annotations')]
}

async function getRelatedData(accession: string, model: 'experiments' | 'local_samples' | 'assemblies' | 'annotations' | 'biosamples') {
  const { data } = await OrganismService.getOrganismRelatedData(accession, model)
  return data
}

async function getCoordinates(taxid: string) {
  const { data } = await GeoLocationService.getLocationsByOrganims(taxid)
  coordinates.value = [...data]
}

</script>

<style scoped lang="scss">
.gallery-carousel {
  width: 80vw;
  max-width: 100%;

  @media all and (max-width: 576px) {
    width: 100%;
  }
}

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
