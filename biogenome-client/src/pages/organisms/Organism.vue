<template>
  <DetailsHeader :details="details" />
  <div v-if="validTabs.length">
    <Tabs :tab="tab" :tabs="validTabs" @update-view="(v: string) => tab = v" />
    <div class="row">
      <div v-if="isDataModel(tab)" :key="tab" class="flex lg12 md12 sm12 xs12">
        <Suspense>
          <RelatedDataTable :taxid="taxid" :model="tab" />
          <template #fallback>
            <VaSkeleton height="500px"></VaSkeleton>
          </template>
        </Suspense>
      </div>
      <div v-else-if="tab === 'map'" style="height: 450px;" class="flex lg12 md12 sm12 xs12">
        <LeafletMap :taxid="taxid" />
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
import MetadataTreeCard from '../../components/cards/MetadataTreeCard.vue'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import Tabs from '../../components/common/Tabs.vue'
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { Details } from '../../data/types'
import Publications from './components/Publications.vue'
import VernacularNames from './components/VernacularNames.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Images from './components/Images.vue'
import RelatedDataTable from '../../components/tables/RelatedDataTable.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'
import pages from '../../../configs/pages.json'

const { init } = useToast()

const { t } = useI18n()
const props = defineProps<{
  taxid: string
}>()

const details = ref<
  Details | any
>()
const images = ref<string[]>([])
const commonNames = ref<Record<string, any>[]>([])
const publications = ref<Record<string, any>[]>([])
const coordinates = ref(0)
const validDataTabs = ref<string[]>([])
const metadata = ref<[string, any][]>([])
const validTabs = ref<{ label: string, name: string }[]>([])

function setValidTabs() {
  const tabs = []
  if (metadata.value.length) tabs.push({ name: 'metadata', label: 'Metadata' })
  if (validDataTabs.value.length) tabs.push(...validDataTabs.value.map(tab => {
    return { label: t(`tabs.${tab}`), name: tab }
  }))
  if (coordinates.value) tabs.push({ name: 'map', label: t('tabs.map') })
  if (images.value.length) tabs.push({ name: 'images', label: t('tabs.images') })
  if (commonNames.value.length) tabs.push({ name: 'names', label: t('tabs.names') })
  if (publications.value.length) tabs.push({ name: 'publications', label: t('tabs.publications') })
  return tabs
}

const tab = ref('')

watchEffect(async () => {
  await getData(props.taxid)
})

function isDataModel(str: string): boolean {
  return Object.keys(pages).includes(str);
}

async function getData(taxid: string) {
  try {
    await getOrganism(taxid)
    await lookupData(taxid)
    await getCoordinates(taxid)
    validTabs.value = [...setValidTabs()]
  } catch (e) {
    const axiosError = e as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}
async function getOrganism(taxid: string) {
  const { data } = await OrganismService.getOrganism(taxid)
  details.value = { ...parseDetails(data) }
  parseExtraInfo(data)
}

async function lookupData(taxid: string) {
  const { data } = await OrganismService.lookupData(taxid)
  const filteredEntries = Object.entries(data).filter(([k, v]) => v).map(([k, v]) => k)
  validDataTabs.value = [...filteredEntries]
}

async function getCoordinates(taxid: string) {
  const { data } = await GeoLocationService.getLocations({ taxid: taxid, limit: 2 })
  coordinates.value = data.total
}
function parseExtraInfo(data: Record<string, any>) {
  images.value = [...data.image_urls]
  commonNames.value = [...data.common_names]
  publications.value = [...data.publications]
  metadata.value = [...Object.entries(data.metadata)]
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




</script>
