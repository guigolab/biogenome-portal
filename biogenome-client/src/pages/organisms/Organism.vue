<template>
  <DetailsSkeleton v-if="isLoading" />
  <div v-else>
    <div v-if="organism">
      <DetailsHeader v-if="details" :details="details" />
      <VaTabs v-model="tab">
        <template #tabs>
          <VaTab label="Metadata" name="metadata"></VaTab>
          <VaTab v-if="assemblies.length" :label="t('tabs.assemblies')" name="assemblies"></VaTab>
          <VaTab v-if="experiments.length" :label="t('tabs.experiments')" name="experiments"></VaTab>
          <VaTab v-if="biosamples.length" :label="t('tabs.biosamples')" name="biosamples"></VaTab>
          <VaTab v-if="localSamples.length" :label="t('tabs.local_samples')" name="local_samples"></VaTab>
          <VaTab v-if="annotations.length" :label="t('tabs.annotations')" name="annotations"></VaTab>
          <VaTab v-if="images.length" :label="t('tabs.images')" name="images"></VaTab>
          <VaTab v-if="commonNames.length" :label="t('tabs.names')" name="names"></VaTab>
          <VaTab v-if="publications.length" :label="t('tabs.publications')" name="publications"></VaTab>
          <VaTab v-if="coordinates.length" :label="t('tabs.map')" name="map"></VaTab>
        </template>
      </VaTabs>
      <VaDivider style="margin-top: 0;" />
      <div v-if="['assemblies', 'experiments', 'biosamples', 'annotations', 'local_samples'].includes(tab)" class="row">
        <div :key="tab" class="flex lg12 md12 sm12 xs12">
          <VaDataTable :items="currentTable?.items" :columns="currentTable?.columns">
            <template #cell(actions)="{ rowData }">
              <va-chip v-if="getRoute(rowData)" :to="getRoute(rowData)" size="small">{{ t('buttons.view') }}</va-chip>
            </template>
            <template #cell(gff_gz_location)="{ rowData }">
              <va-chip :href="rowData.gff_gz_location">{{ t('buttons.download') }}</va-chip>
            </template>
            <template #cell(tab_index_location)="{ rowData }">
              <va-chip :href="rowData.tab_index_location" size="small">{{ t('buttons.download') }}</va-chip>
            </template>
          </VaDataTable>
        </div>
      </div>
      <div class="row" v-else-if="tab === 'map'">
        <div style="height: 450px;" class="flex lg12 md12 sm12 xs12">
          <LeafletMap :coordinates="coordinates" />
        </div>
      </div>
      <div class="row" v-else-if="tab === 'images'">
        <div class="flex lg12 md12 sm12 xs12">
          <Images :images="images" />
        </div>
      </div>
      <div class="row" v-else-if="tab === 'names'">
        <div class="flex lg12 md12 sm12 xs12">
          <VernacularNames :names="commonNames" />
        </div>
      </div>
      <div class="row" v-else-if="tab === 'publications'">
        <div class="flex lg12 md12 sm12 xs12">
          <Publications :publications="publications" />
        </div>
      </div>
      <div class="row" v-else>
        <div class="flex lg12 md12 sm12 xs12">
          <MetadataTreeCard :metadata="Object.entries(organism.metadata)" />
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
import OrganismService from '../../services/clients/OrganismService'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { Details, SampleLocations } from '../../data/types'
import Publications from './components/Publications.vue'
import VernacularNames from './components/VernacularNames.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Images from './components/Images.vue'
import { models } from '../../../config.json'
import DetailsSkeleton from '../common/components/DetailsSkeleton.vue'

const { t } = useI18n()
const props = defineProps<{
  taxid: string
}>()
const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
const details = ref<
  Details | any
>()
const organism = ref<Record<string, any>>()

const tab = ref('metadata')

const metadata = ref<Record<string, any> | null>(null)
const commonNames = ref<Record<string, string>[]>([])
const publications = ref<Record<string, string>[]>([])
const images = ref<string[]>([])
const coordinates = ref<SampleLocations[]>([])
const assemblies = ref<Record<string, any>[]>([])
const biosamples = ref<Record<string, any>[]>([])
const experiments = ref<Record<string, any>[]>([])
const localSamples = ref<Record<string, any>[]>([])
const annotations = ref<Record<string, any>[]>([])


watchEffect(async () => {
  await getData(props.taxid)
})


const currentTable = computed(() => {
  const modelValue = tab.value as 'assemblies' | 'experiments' | 'local_samples' | 'biosamples' | 'annotations'
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
    case 'annotations':
      items = annotations.value
      break
    case 'biosamples':
      items = biosamples.value
      break
    case 'local_samples':
      items = localSamples.value
      break
  }
  return { items, columns }
})

async function getData(taxid: string) {
  try {
    isLoading.value = true
    const { data } = await OrganismService.getOrganism(props.taxid)
    details.value = { ...parseDetails(data) }
    organism.value = { ...data }
    if (data.metadata) metadata.value = data.metadata
    if (data.publications) publications.value = data.publications
    if (data.image_urls) images.value = data.image_urls
    if (data.common_names) commonNames.value = data.common_names
    await getCoordinates(taxid)
    const { assemblies, experiments, local_samples, biosamples, annotations } = await lookupData(taxid)
    if (assemblies) await getRelatedData(taxid, 'assemblies')
    if (experiments) await getRelatedData(taxid, 'experiments')
    if (biosamples) await getRelatedData(taxid, 'biosamples')
    if (annotations) await getRelatedData(taxid, 'annotations')
    if (local_samples) await getRelatedData(taxid, 'local_samples')
  } catch (e) {
    errorMessage.value = e
  } finally {
    isLoading.value = false
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

async function getRelatedData(accession: string, model: 'experiments' | 'local_samples' | 'assemblies' | 'annotations' | 'biosamples') {
  const { data } = await OrganismService.getOrganismRelatedData(accession, model)
  switch (model) {
    case 'assemblies':
      assemblies.value = [...data]
      break
    case 'experiments':
      experiments.value = [...data]
      break
    case 'local_samples':
      localSamples.value = [...data]
      break
    case 'biosamples':
      biosamples.value = [...data]
      break
    case 'annotations':
      annotations.value = [...data]
  }
}

function getRoute(rowData: Record<string, any>) {
  switch (tab.value) {
    case 'assemblies':
      return { name: 'assembly', params: { accession: rowData.accession } }

    case 'biosamples':
      return { name: 'biosample', params: { accession: rowData.accession } }

    case 'experiments':
      return { name: 'experiment', params: { accession: rowData.experiment_accession } }

    case 'organisms':
      return { name: 'organism', params: { taxid: rowData.taxid } }

    case 'local_samples':
      return { name: 'local_sample', params: { id: rowData.local_id } }

    case 'annotations':
      return { name: 'annotation', params: { name: rowData.name } }
  }
}

async function getCoordinates(taxid: string) {
  const { data } = await GeoLocationService.getLocationsByOrganims(taxid)
  coordinates.value = [...data]
}

</script>

<style scoped lang="scss">
.gallery-carousel {
  width: 80vw;
  max-width: 100%;

  @media all and (max-width: 576px) {
    width: 100%;
  }
}

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
