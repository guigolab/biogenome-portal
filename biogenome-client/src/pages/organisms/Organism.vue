<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'organisms' }" :label="t('organismDetails.breadcrumb')" />
    <va-breadcrumbs-item active :label="taxid" />
  </va-breadcrumbs>
  <va-divider />
  <va-skeleton v-if="isLoading" height="90vh" />
  <div v-else-if="errorMessage">
    <va-card stripe stripe-color="danger">
      <va-card-content>
        {{ errorMessage }}
      </va-card-content>
    </va-card>
  </div>
  <div v-else>
    <DetailsHeader :details="details" />
    <KeyValueCard v-if="organismSelectedMetadata.length && metadata" :metadata="metadata"
      :selected-metadata="organismSelectedMetadata" />
    <!-- TODO add ideogram -->
    <!-- <Ideogram v-if="assembly && assembly.taxid && hasChromosomes" :taxid="assembly.taxid" :accession="accession" /> -->
    <div class="row row-equal">
      <div class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <TaxonLineage :taxid="taxid"></TaxonLineage>
          <template #fallback>
            <va-skeleton height="400px"></va-skeleton>
          </template>
        </Suspense>
      </div>
      <div v-if="images.length" class="flex lg6 md6 sm12 xs12">
        <Images :images="images"/>
        <!-- <va-carousel height="400px" :items="images" stateful /> -->
      </div>
      <div v-for="(dt, index) in validData" class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <template #default>
            <RelatedDataCard :object-id="taxid" :related-data="dt" :callback="'organism'" :key="index" />
          </template>
          <template #fallback>
            <va-skeleton height="300px" />
          </template>
        </Suspense>
      </div>
      <div v-if="metadata && Object.keys(metadata).length" class="flex lg6 md6 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
      <div v-if="coordinates.length" class="flex lg6 md6 sm12 xs12 chart">
        <LeafletMap :coordinates="coordinates" />
      </div>
      <div v-if="publications.length" class="flex lg6 md6 sm12 xs12">
        <Publications :publications="publications" />
      </div>
      <div v-if="commonNames.length" class="flex lg6 md6 sm12 xs12">
        <VernacularNames :names="commonNames" />
      </div>

    </div>
  </div>
</template>
<script setup lang="ts">
import OrganismService from '../../services/clients/OrganismService'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import KeyValueCard from '../../components/ui/KeyValueCard.vue'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import { onMounted, ref } from 'vue'
import RelatedDataCard from '../../components/ui/RelatedDataCard.vue'
import { useI18n } from 'vue-i18n'
import { Details, SampleLocations } from '../../data/types'
import TaxonLineage from './components/TaxonLineage.vue'
import Publications from './components/Publications.vue'
import VernacularNames from './components/VernacularNames.vue'
import { relatedData } from './configs'
import { organismSelectedMetadata } from '../../../config.json'
import GeoLocationService from '../../services/clients/GeoLocationService'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Images from './components/Images.vue'
const { t } = useI18n()
const props = defineProps<{
  taxid: string
}>()
const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
const details = ref<
  Details | any
>()
const metadata = ref<Record<string, any> | null>(null)
const validData = ref<Record<string, string>[]>([])
const commonNames = ref<Record<string, string>[]>([])
const publications = ref<Record<string, string>[]>([])
const images = ref<string[]>([])
const coordinates = ref<SampleLocations[]>([])

onMounted(async () => {
  try {
    isLoading.value = true
    const { data } = await OrganismService.getOrganism(props.taxid)
    details.value = parseDetails(data)
    if (data.metadata) metadata.value = data.metadata

    if (data.publications) publications.value = data.publications

    if (data.image_urls) images.value = data.image_urls

    if (data.common_names) commonNames.value = data.common_names

    const models = relatedData.filter(
      (relatedModel) => Object.keys(data).includes(relatedModel.key) && data[relatedModel.key].length,
    )
    if (models.length) validData.value = [...models]
    await getCoordinates(props.taxid)
  } catch (e) {
    errorMessage.value = e
  } finally {
    isLoading.value = false
  }
})

function parseDetails(organism: Record<string, any>) {
  const details: Details = {
    title: organism.scientific_name,
    ncbiPath: `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${organism.taxid}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${organism.taxid}`
  }
  return details
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
