<template>
  <DetailsHeader v-if="details" :details="details" />
  <VaSkeletonGroup v-else>
    <VaSkeleton tag="h1" variant="text" class="va-h1" />
    <VaSkeleton variant="text" :lines="1" />
  </VaSkeletonGroup>
  <VaTabs v-model="tab">
    <template #tabs>
      <VaTab :label="t('tabs.metadata')" name="metadata"></VaTab>
      <VaTab v-if="coordinates.length" :label="t('tabs.map')" name="map"></VaTab>
    </template>
  </VaTabs>
  <VaDivider style="margin-top: 0;" />
  <div class="row">
    <div v-if="tab === 'map'" style="height: 450px;" class="flex lg12 md12 sm12 xs12">
      <LeafletMap :coordinates="coordinates" />
    </div>
    <div v-else class="flex lg12 md12 sm12 xs12">
      <MetadataTreeCard v-if="sample" :metadata="Object.entries(sample.metadata)" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import LocalSampleService from '../../services/clients/LocalSampleService'
import { useI18n } from 'vue-i18n'
import { Details, SampleLocations } from '../../data/types'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'


const { init } = useToast()
const tab = ref('metadata')

const details = ref<
  Details | any
>()
const { t } = useI18n()
const props = defineProps<{
  id: string
}>()

const sample = ref<Record<string, any>>()
const coordinates = ref<SampleLocations[]>([])

watchEffect(async () => {
  await getData(props.id)
})


async function getData(id: string) {
  try {
    const { data } = await LocalSampleService.getLocalSample(id)
    details.value = { ...parseDetails(data) }
    sample.value = { ...data }
    await getCoordinates(id)
  } catch (error) {
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}
async function getCoordinates(accession: string) {
  const { data } = await GeoLocationService.getLocationsByLocalSample(accession)
  coordinates.value = [data]
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