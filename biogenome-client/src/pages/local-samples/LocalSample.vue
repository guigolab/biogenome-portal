<template>
  <DetailsSkeleton v-if="isLoading" />
  <div v-else>
    <div v-if="sample">
      <DetailsHeader v-if="details" :details="details" />
      <VaTabs v-model="tab">
        <template #tabs>
          <VaTab :label="t('tabs.metadata')" name="metadata"></VaTab>
          <VaTab v-if="coordinates.length" :label="t('tabs.map')" name="map"></VaTab>
        </template>
      </VaTabs>
      <div class="row" v-if="tab === 'map'">
        <div style="height: 450px;" class="flex lg12 md12 sm12 xs12">
          <LeafletMap :coordinates="coordinates" />
        </div>
      </div>
      <div class="row" v-else>
        <div class="flex lg12 md12 sm12 xs12">
          <MetadataTreeCard :metadata="Object.entries(sample.metadata)" />
        </div>
      </div>
    </div>
    <div v-else>
      <VaAlert color="danger" class="mb-6">
        {{ errorMessage || "Something happened" }}
      </VaAlert>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import LocalSampleService from '../../services/clients/LocalSampleService'
import { useI18n } from 'vue-i18n'
import { Details, SampleLocations } from '../../data/types'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import DetailsSkeleton from '../common/components/DetailsSkeleton.vue'
import { AxiosError } from 'axios'

const tab = ref('metadata')

const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
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
    isLoading.value = true
    errorMessage.value = null
    const { data } = await LocalSampleService.getLocalSample(id)
    details.value = { ...parseDetails(data) }
    sample.value = { ...data }

    await getCoordinates(id)
  } catch (error) {
    const axiosError = error as AxiosError
    if (axiosError.code === "404") {
      errorMessage.value = id + " Not Found"
    } else {
      errorMessage.value = axiosError.message
    }
  } finally {
    isLoading.value = false
  }
}
async function getCoordinates(accession: string) {
  try {
    isLoading.value = true
    const { data } = await GeoLocationService.getLocationsByLocalSample(accession)
    coordinates.value = [data]
  } catch (e) {
    console.log(e)
  } finally {
    isLoading.value = false
  }
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