<template>
  <DetailsHeader :details="details" />
  <div v-if="validTabs.length">
    <Tabs :tabs="validTabs" :tab="tab" @updateView="(v: string) => tab = v" />
    <div class="row">
      <div v-if="tab === 'map'" class="flex lg12 md12 sm12 xs12 h-450">
        <LeafletMap :sample_accession="id" />
      </div>
      <div v-else class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="sample ? Object.entries(sample.metadata) : []" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import LocalSampleService from '../../services/clients/LocalSampleService'
import { Details } from '../../data/types'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import Tabs from '../../components/common/Tabs.vue'
import MetadataTreeCard from '../../components/cards/MetadataTreeCard.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'


const { init } = useToast()
const tab = ref('')
const validTabs = ref<{ label: string, name: string }[]>([])

const details = ref<
  Details | any
>()
const props = defineProps<{
  id: string
}>()

const sample = ref<Record<string, any>>()
const coordinates = ref(0)

watchEffect(async () => {
  await getData(props.id)
})

async function getData(id: string) {
  try {
    await getSample(id)
    await getCoordinates(id)
    setValidTabs()
  } catch (error) {
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

function setValidTabs() {
  const t = [{ name: 'metadata', label: 'tabs.metadata' }]
  if (coordinates.value) t.push({ name: 'map', label: 'tabs.map' })
  validTabs.value = [...t]
}

async function getSample(id: string) {
  const { data } = await LocalSampleService.getLocalSample(id)
  details.value = { ...parseDetails(data) }
  sample.value = { ...data }
}
async function getCoordinates(accession: string) {
  const { data } = await GeoLocationService.getLocations({ sample_accession: accession, limit: 2 })
  coordinates.value = data.total
}

function parseDetails(localSample: Record<string, any>) {
  const id = localSample.local_id
  const details: Details = {
    title: id,
    button1: {
      route: { name: 'organism', params: { taxid: localSample.taxid } },
      label: localSample.scientific_name
    }
  }
  return details
}
</script>