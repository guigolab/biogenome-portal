<template>
  <DetailsHeader v-if="details" :details="details" />
  <VaSkeletonGroup v-else>
    <VaSkeleton tag="h1" variant="text" class="va-h1" />
    <VaSkeleton variant="text" :lines="1" />
  </VaSkeletonGroup>
  <div v-if="showTabs">
    <VaTabs v-model="tab">
      <template #tabs>
        <VaTab v-for="tab in tabs" :key="tab.name" :name="tab.name" :label="tab.label" />
      </template>
    </VaTabs>
    <VaDivider style="margin-top: 0;" />
    <div class="row">
      <div v-if="isDataModel(tab)" :key="tab" class="flex lg12 md12 sm12 xs12">
        <Suspense>
          <RelatedDataTable :taxid="taxid" :model="(tab as DataModel)" />
          <template #fallback>
            <VaSkeleton height="500px"></VaSkeleton>
          </template>
        </Suspense>
      </div>
      <div v-else-if="tab === 'map'" style="height: 450px;" class="flex lg12 md12 sm12 xs12">
        <LeafletMap :coordinates="coordinates" />
      </div>
      <div v-else class="flex lg12 md12 sm12 xs12">
        <Images v-if="tab === 'images'" :images="images" />
        <VernacularNames v-else-if="tab === 'names'" :names="commonNames" />
        <Publications v-else-if="tab === 'publications'" :publications="publications" />
        <MetadataTreeCard v-else-if="tab === 'metadata'" :metadata="metadata" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import OrganismService from '../../services/clients/OrganismService'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import { computed, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { Details, SampleLocations } from '../../data/types'
import Publications from './components/Publications.vue'
import VernacularNames from './components/VernacularNames.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Images from './components/Images.vue'
import { models } from '../../../config.json'
import RelatedDataTable from './components/RelatedDataTable.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'

const { init } = useToast()

type DataModel = keyof typeof models;

const { t } = useI18n()
const showTabs = ref(false)
const props = defineProps<{
  taxid: string
}>()

const details = ref<
  Details | any
>()
const images = ref<string[]>([])
const commonNames = ref<Record<string, any>[]>([])
const publications = ref<Record<string, any>[]>([])
const coordinates = ref<SampleLocations[]>([])
const validDataTabs = ref<DataModel[]>([])
const metadata = ref<[string, any][]>([])

const tabs = computed(() => {
  const tabs = []
  if (metadata.value.length) tabs.push({ name: 'metadata', label: 'Metadata' })
  if (validDataTabs.value.length) tabs.push(...validDataTabs.value.map(tab => {
    return { label: t(`tabs.${tab}`), name: tab }
  }))
  if (coordinates.value.length) tabs.push({ name: 'map', label: t('tabs.map') })
  if (images.value.length) tabs.push({ name: 'images', label: t('tabs.images') })
  if (commonNames.value.length) tabs.push({ name: 'names', label: t('tabs.names') })
  if (publications.value.length) tabs.push({ name: 'publications', label: t('tabs.publications') })
  return tabs
})


const tab = ref('')

watchEffect(async () => {
  await getData(props.taxid)
})


watch(() => tabs.value, () => {
  console.log('Watching tabs')
  if (tabs.value.length) {
    tab.value = tabs.value[0].name
    showTabs.value = true
  } else {
    showTabs.value = false
  }
})

function isDataModel(str: string): boolean {
  return Object.keys(models).includes(str);
}

async function getData(taxid: string) {
  try {
    const { data } = await OrganismService.getOrganism(props.taxid)
    details.value = { ...parseDetails(data) }
    images.value = [...data.image_urls]
    commonNames.value = [...data.common_names]
    publications.value = [...data.publications]
    metadata.value = Object.entries(data.metadata)
    const resp = await lookupData(taxid)
    const filteredEntries: DataModel[] = Object.entries(resp).filter(([k, v]) => v).map(([k, v]) => k as DataModel)
    coordinates.value = [...await getCoordinates(taxid)]
    validDataTabs.value = [...filteredEntries]
  } catch (e) {
    const axiosError = e as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

function parseDetails(organism: Record<string, any>) {
  const details: Details = {
    title: organism.scientific_name,
    description: organism.insdc_common_name ? organism.insdc_common_name : undefined,
    ncbiPath: `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${organism.taxid}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${organism.taxid}`
  }
  return details
}

async function lookupData(taxid: string) {
  const { data } = await OrganismService.lookupData(taxid)
  return data
}

async function getCoordinates(taxid: string) {
  const { data } = await GeoLocationService.getLocationsByOrganims(taxid)
  return data
}


</script>
