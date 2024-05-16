<template>
  <DetailsHeader v-if="details" :details="details" />
  <VaSkeletonGroup v-else>
    <VaSkeleton tag="h1" variant="text" class="va-h1" />
    <VaSkeleton variant="text" :lines="1" />
  </VaSkeletonGroup>
  <VaTabs v-model="tab">
    <template #tabs>
      <VaTab label="Metadata" name="metadata"></VaTab>
      <VaTab :key="dT" v-for="dT in validDataTabs" :label="t(`tabs.${dT}`)" :name="dT" />
      <VaTab v-if="organism && organism.image_urls.length" :label="t('tabs.images')" name="images" />
      <VaTab v-if="organism && organism.common_names.length" :label="t('tabs.names')" name="names" />
      <VaTab v-if="organism && organism.publications.length" :label="t('tabs.publications')" name="publications" />
      <VaTab v-if="coordinates.length" :label="t('tabs.map')" name="map" />
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
    <div v-else-if="organism" class="flex lg12 md12 sm12 xs12">
      <Images v-if="tab === 'images'" :images="organism.image_urls" />
      <VernacularNames v-else-if="tab === 'names'" :names="organism.common_names" />
      <Publications v-else-if="tab === 'publications'" :publications="organism.publications" />
      <MetadataTreeCard v-else :metadata="Object.entries(organism.metadata)" />
    </div>
  </div>
</template>
<script setup lang="ts">
import OrganismService from '../../services/clients/OrganismService'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import { ref, watchEffect } from 'vue'
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

const props = defineProps<{
  taxid: string
}>()

const details = ref<
  Details | any
>()

const tab = ref('metadata')

const coordinates = ref<SampleLocations[]>([])
const validDataTabs = ref<DataModel[]>([])
const organism = ref<Record<string, any>>()

watchEffect(async () => {
  await getData(props.taxid)
})

function isDataModel(str: string): boolean {
  return Object.keys(models).includes(str);
}

async function getData(taxid: string) {
  try {
    const { data } = await OrganismService.getOrganism(props.taxid)
    details.value = { ...parseDetails(data) }
    organism.value = { ...data }
    const resp = await lookupData(taxid)
    const filteredEntries: DataModel[] = Object.entries(resp).filter(([k, v]) => v).map(([k, v]) => k as DataModel)
    validDataTabs.value = [...filteredEntries]
    await getCoordinates(taxid)
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
  coordinates.value = [...data]
}

</script>
