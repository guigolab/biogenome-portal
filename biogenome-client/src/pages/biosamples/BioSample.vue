<template>
  <DetailsHeader :details="details" />
  <div v-if="validTabs.length">
    <Tabs :tabs="validTabs" :tab="tab" @updateView="(v: string) => tab = v" />
    <div class="row">
      <div v-if="isDataModel(tab)" :key="tab" class="flex lg12 md12 sm12 xs12">
        <Suspense>
          <RelatedDataTable :accession="accession" :model="tab" />
          <template #fallback>
            <VaSkeleton height="450px"></VaSkeleton>
          </template>
        </Suspense>
      </div>
      <div v-else-if="tab === 'map'" class="flex lg12 md12 sm12 xs12 h-450">
        <LeafletMap :sample_accession="accession" />
      </div>
      <div v-else class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import BioSampleService from '../../services/clients/BioSampleService'
import { ref, watchEffect } from 'vue'
import { BioSample, Details } from '../../data/types'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import Tabs from '../../components/common/Tabs.vue'
import MetadataTreeCard from '../../components/cards/MetadataTreeCard.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import { AxiosError } from 'axios'
import RelatedDataTable from '../../components/tables/RelatedDataTable.vue'
import { useToast } from 'vuestic-ui/web-components'
import pages from '../../../configs/pages.json'

const { init } = useToast()
const props = defineProps<{
  accession: string
}>()

type DataModel = 'experiments' | 'sub_samples' | 'assemblies';

const details = ref<
  Details | any
>()
const coordinates = ref(0)
const metadata = ref<[string, any][]>([])
const validDataTabs = ref<DataModel[]>([])


const tab = ref('')

const validTabs = ref<{ label: string, name: string }[]>([])

function isDataModel(str: string): boolean {
  return Object.keys(pages).includes(str) || str === 'sub_samples';
}

watchEffect(async () => {
  await getData(props.accession)
})

async function getData(accession: string) {
  try {
    await getBioSample(accession)
    await lookupData(accession)
    await getCoordinates(accession)
    setValidTabs()
  } catch (error) {
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

async function getBioSample(accession: string) {
  const { data } = await BioSampleService.getBioSample(accession)
  details.value = { ...parseDetails(data) }
  metadata.value = [...Object.entries(data.metadata)]
}

// Function to get and set the valid tabs
function setValidTabs() {
  const tabs = [{ name: 'metadata', label: 'tabs.metadata' }]
  if (validDataTabs.value.length) {
    tabs.push(...validDataTabs.value.map(tab => {
      return { label: tab === 'sub_samples' ? 'tabs.biosamples' : `tabs.${tab}`, name: tab }
    }))
  }
  if (coordinates.value) {
    tabs.push({ name: 'map', label: 'tabs.map' })
  }

  // Keep the current tab if it's still valid
  if (!tabs.some(t => t.name === tab.value)) {
    tab.value = tabs[0].name // Default to the first tab if the current one is not valid
  }

  validTabs.value = [...tabs]
}
async function lookupData(accession: string) {
  const { data } = await BioSampleService.getLookupData(accession)
  validDataTabs.value = [
    ...Object.entries(data)
      .filter(([k, v]) => v)
      .map(([k, v]) => k as DataModel)
  ]
}

async function getCoordinates(accession: string) {
  const { data } = await GeoLocationService.getLocations({ sample_accession: accession, limit: 2 })
  coordinates.value = data.total
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
