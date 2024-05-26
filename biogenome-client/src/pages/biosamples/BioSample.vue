<template>
  <DetailsHeader v-if="details" :details="details" />
  <VaSkeletonGroup v-else>
    <VaSkeleton tag="h1" variant="text" class="va-h1" />
    <VaSkeleton variant="text" :lines="1" />
  </VaSkeletonGroup>
  <VaTabs v-model="tab">
    <template #tabs>
      <VaTab :label="t('tabs.metadata')" name="metadata"></VaTab>
      <VaTab :key="tab" v-for="tab in validDataTabs"
        :label="t(tab === 'sub_samples' ? 'tabs.biosamples' : `tabs.${tab}`)" :name="tab">
      </VaTab>
      <VaTab v-if="coordinates.length" :label="t('tabs.map')" name="map"></VaTab>
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
    <div v-else-if="biosample" class="flex lg12 md12 sm12 xs12">
      <MetadataTreeCard :metadata="Object.entries(biosample.metadata)" />
    </div>
  </div>
</template>
<script setup lang="ts">
import BioSampleService from '../../services/clients/BioSampleService'
import { ref, watchEffect } from 'vue'
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
type DataModel = 'experiments' | 'sub_samples' | 'assemblies';

const details = ref<
  Details | any
>()
const tab = ref('metadata')
const coordinates = ref<SampleLocations[]>([])
const biosample = ref<BioSample>()
const validDataTabs = ref<DataModel[]>([])

function isDataModel(str: string): boolean {
  return Object.keys(models).includes(str) || str === 'sub_samples';
}


watchEffect(async () => {
  await getData(props.accession)
})


async function getData(accession: string) {
  try {
    const { data } = await BioSampleService.getBioSample(accession)
    details.value = { ...parseDetails(data) }
    biosample.value = { ...data }
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
