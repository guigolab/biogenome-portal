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
          <RelatedDataTable :accession="accession" :model="(tab as DataModel)" />
          <template #fallback>
            <VaSkeleton height="500px"></VaSkeleton>
          </template>
        </Suspense>
      </div>
      <div v-else-if="tab === 'map'" style="height: 450px;" class="flex lg12 md12 sm12 xs12">
        <LeafletMap :coordinates="coordinates" />
      </div>
      <div v-else-if="tab === 'metadata'" class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
    </div>
  </div>

</template>
<script setup lang="ts">
import BioSampleService from '../../services/clients/BioSampleService'
import { computed, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { BioSample, Details, SampleLocations } from '../../data/types'
import { models } from '../../../config.json'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import { AxiosError } from 'axios'
import RelatedDataTable from './components/RelatedDataTable.vue'
import { useToast } from 'vuestic-ui/web-components'


const { init } = useToast()
const { t } = useI18n()
const props = defineProps<{
  accession: string
}>()

const showTabs = ref(false)
type DataModel = 'experiments' | 'sub_samples' | 'assemblies';

const details = ref<
  Details | any
>()
const coordinates = ref<SampleLocations[]>([])
const metadata = ref<[string, any][]>([])
const validDataTabs = ref<DataModel[]>([])


const tab = ref('')

const tabs = computed(() => {
  const tabs = []
  if (metadata.value.length) tabs.push({ name: 'metadata', label: 'Metadata' })
  if (validDataTabs.value.length) tabs.push(...validDataTabs.value.map(tab => {
    return { label: t(tab === 'sub_samples' ? 'tabs.biosamples' : `tabs.${tab}`), name: tab }
  }))
  if (coordinates.value.length) tabs.push({ name: 'map', label: t('tabs.map') })
  return tabs
})

function isDataModel(str: string): boolean {
  return Object.keys(models).includes(str) || str === 'sub_samples';
}

watchEffect(async () => {
  await getData(props.accession)
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

async function getData(accession: string) {
  try {
    const { data } = await BioSampleService.getBioSample(accession)
    details.value = { ...parseDetails(data) }
    metadata.value = Object.entries(data.metadata)
    const resp = await lookupData(accession)
    const filteredEntries: DataModel[] = Object.entries(resp).filter(([k, v]) => v).map(([k, v]) => k as DataModel)
    validDataTabs.value = [...filteredEntries]
    await getCoordinates(accession)
  } catch (error) {
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}



async function lookupData(accession: string) {
  const { data } = await BioSampleService.getLookupData(accession)
  return data
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
