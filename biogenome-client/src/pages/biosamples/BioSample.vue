<template>
  <DetailsSkeleton v-if="isLoading" />
  <div v-else>
    <div v-if="biosample">
      <DetailsHeader v-if="details" :details="details" />
      <VaTabs v-model="tab">
        <template #tabs>
          <VaTab :label="t('tabs.metadata')" name="metadata"></VaTab>
          <VaTab v-if="assemblies.length" :label="t('tabs.assemblies')" name="assemblies"></VaTab>
          <VaTab v-if="experiments.length" :label="t('tabs.experiments')" name="experiments"></VaTab>
          <VaTab v-if="subSamples.length" :label="t('tabs.biosamples')" name="biosamples"></VaTab>
          <VaTab v-if="coordinates.length" :label="t('tabs.map')" name="map"></VaTab>
        </template>
      </VaTabs>
      <VaDivider style="margin-top: 0;" />

      <div v-if="['assemblies', 'experiments', 'sub_samples'].includes(tab)" class="row">
        <div :key="tab" class="flex lg12 md12 sm12 xs12">
          <VaDataTable :items="currentTable?.items" :columns="currentTable?.columns">
            <template #cell(actions)="{ rowData }">
              <va-chip v-if="getRoute(rowData)" :to="getRoute(rowData)" size="small">{{ t('buttons.view') }}</va-chip>
            </template>
          </VaDataTable>
        </div>
      </div>
      <div class="row" v-else-if="tab === 'map'">
        <div style="height: 450px;" class="flex lg12 md12 sm12 xs12">
          <LeafletMap :coordinates="coordinates" />
        </div>
      </div>
      <div class="row" v-else>
        <div class="flex lg12 md12 sm12 xs12">
          <MetadataTreeCard :metadata="Object.entries(biosample.metadata)" />
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
import BioSampleService from '../../services/clients/BioSampleService'
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { BioSample, Details, SampleLocations } from '../../data/types'
import { models } from '../../../config.json'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import DetailsSkeleton from '../common/components/DetailsSkeleton.vue'
import { AxiosError } from 'axios'

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
const coordinates = ref<SampleLocations[]>([])
const assemblies = ref<Record<string, any>[]>([])
const experiments = ref<Record<string, any>[]>([])
const subSamples = ref<Record<string, any>[]>([])
const biosample = ref<BioSample>()


const currentTable = computed(() => {
  const modelValue = tab.value as 'assemblies' | 'experiments' | 'biosamples'
  const columns = [...models[modelValue].columns]
  columns.push('actions')
  let items = []
  switch (modelValue) {
    case 'assemblies':
      items = assemblies.value
      break
    case 'experiments':
      items = experiments.value
      break
    case 'biosamples':
      items = subSamples.value
      break
  }
  return { items, columns }
})



watchEffect(async () => {
  await getData(props.accession)
})


async function getData(accession: string) {
  try {
    isLoading.value = true
    errorMessage.value = null
    const { data } = await BioSampleService.getBioSample(accession)
    biosample.value = { ...data }
    details.value = { ...parseDetails(data) }
    const { assemblies, experiments, sub_samples } = await lookupData(accession)
    if (assemblies) await getRelatedData(accession, 'assemblies')
    if (experiments) await getRelatedData(accession, 'experiments')
    if (sub_samples) await getRelatedData(accession, 'sub_samples')
    await getCoordinates(accession)
  } catch (error) {
    const axiosError = error as AxiosError
    if (axiosError.code === "404") {
      errorMessage.value = accession + " Not Found"
    } else {
      errorMessage.value = axiosError.message
    }
  } finally {
    isLoading.value = false
  }
}

async function getRelatedData(accession: string, model: 'experiments' | 'sub_samples' | 'assemblies') {
  const { data } = await BioSampleService.getBioSampleRelatedData(accession, model)
  switch (model) {
    case 'assemblies':
      assemblies.value = [...data]
      break
    case 'experiments':
      experiments.value = [...data]
      break
    case 'sub_samples':
      subSamples.value = [...data]
      break
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

function getRoute(rowData: Record<string, any>) {
  switch (tab.value) {
    case 'assemblies':
      return { name: 'assembly', params: { accession: rowData.accession } }

    case 'biosamples':
      return { name: 'biosample', params: { accession: rowData.accession } }

    case 'experiments':
      return { name: 'experiment', params: { accession: rowData.experiment_accession } }
  }
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
