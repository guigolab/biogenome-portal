<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'biosamples' }" :label="t('biosampleList.breadcrumb')"/>
    <va-breadcrumbs-item
      v-if="router.currentRoute.value.name === 'biosample'"
      active
      :label="router.currentRoute.value.params.accession"
    />
  </va-breadcrumbs>
  <va-divider />
  <div v-if="showData">
    <div class="row row-equal justify-space-between">
      <div class="flex">
        <h1 class="va-h1">{{ biosample.accession }}</h1>
        <div class="row align-center">
          <div class="flex">
            <va-button :to="{ name: 'organism', params: { taxid: biosample.taxid } }" preset="primary" icon="pets">{{
              biosample.scientific_name
            }}</va-button>
          </div>
          <div v-if="biosample.metadata['sample derived from']" class="flex">
            <va-button
              :to="{ name: 'biosample', params: { accession: biosample.metadata['sample derived from'] } }"
              preset="primary"
              icon="hub"
            >
              {{ biosample.metadata['sample derived from'] }}</va-button
            >
          </div>
        </div>
      </div>
      <div class="flex">
        <div class="row row-equal align-center">
          <div class="flex">
            <a target="_blank" :href="`https://www.ncbi.nlm.nih.gov/biosample/${biosample.accession}`">
              <va-avatar size="large">
                <img :src="'/ncbi.png'" />
              </va-avatar>
            </a>
          </div>
          <div class="flex">
            <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${biosample.accession}`">
              <va-avatar size="large">
                <img :src="'/ena.jpeg'" />
              </va-avatar>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="row row-equal">
      <div v-if="biosample.metadata.GAL" class="flex">
        <va-card class="mb-4" color="danger">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ biosample.metadata.GAL }}</h2>
            <p style="color: white">{{ t('biosampleDetails.genomeAquisitionLab') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="biosample.metadata['organism part']" class="flex">
        <va-card class="mb-4" color="secondary">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ biosample.metadata['organism part'] }}</h2>
            <p style="color: white">{{ t('biosampleDetails.organismPart') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="biosample.metadata.tissue" class="flex">
        <va-card class="mb-4" color="warning">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ biosample.metadata.tissue }}</h2>
            <p style="color: white">{{t('biosampleDetails.tissue')}}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="biosample.metadata.habitat" class="flex">
        <va-card class="mb-4" color="info">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ biosample.metadata.habitat }}</h2>
            <p style="color: white">{{t('biosampleDetails.habitat')}}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="biosample.metadata['collection date']" class="flex">
        <va-card class="mb-4" color="success">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ biosample.metadata['collection date'] }}</h2>
            <p style="color: white">{{t('biosampleDetails.collectionDate')}}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="biosample.metadata.collection_date" class="flex">
        <va-card class="mb-4" color="success">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ biosample.metadata.collection_date }}</h2>
            <p style="color: white">{{t('biosampleDetails.collectionDate')}}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="biosample.metadata.geo_loc_name" class="flex">
        <va-card class="mb-4" color="primary">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ biosample.metadata.geo_loc_name }}</h2>
            <p style="color: white">{{t('biosampleDetails.geoLocation')}}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="biosample.metadata['geographic location (country and/or sea)']" class="flex">
        <va-card class="mb-4" color="warning">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">
              {{ biosample.metadata['geographic location (country and/or sea)'] }}
            </h2>
            <p style="color: white">{{t('biosampleDetails.country')}}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="biosample.metadata['geographic location (region and locality)']" class="flex">
        <va-card class="mb-4" color="primary">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">
              {{ biosample.metadata['geographic location (region and locality)'] }}
            </h2>
            <p style="color: white">{{t('biosampleDetails.region')}}</p>
          </va-card-content>
        </va-card>
      </div>
    </div>
    <div class="row row-equal">
      <div
        v-if="biosample.location && biosample.location.coordinates"
        class="flex lg12 md12 sm12 xs12"
      >
        <va-card style="min-height: 300px">
          <LeafletMap
            :coordinates="[{latitude: Number(biosample.location.coordinates[1]),longitude: Number(biosample.location.coordinates[0]), id: biosample.accession, taxid: biosample.taxid }]"
          />
        </va-card>
      </div>
      <div v-if="validData.length" class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <RelatedDataCard
            :id="biosample.accession"
            :request="BioSampleService.getBioSampleRelatedData"
            :related-data="validData"
          />
        </Suspense>
      </div>
      <div v-if="bioprojects.length" class="flex lg6 md6 sm12 xs12">
        <BioProjectsCard :bioprojects="bioprojects" />
      </div>
      <div class="flex lg12 md12 sm12 xs12">
        <va-card-title>{{t('uiComponents.metadata')}}</va-card-title>
        <va-card-content>
          <Metadata :metadata="biosample.metadata" />
        </va-card-content>
      </div>
    </div>
  </div>
  <div v-else-if="error">
    <h3 class="va-h3">
      {{ error }}
    </h3>
  </div>
</template>
<script setup lang="ts">
  import BioSampleService from '../../services/clients/BioSampleService'
  import { onMounted, ref, watch } from 'vue'
  import { AxiosResponse } from 'axios'
  import Metadata from '../../components/ui/Metadata.vue'
  import LeafletMap from '../../components/maps/LeafletMap.vue'
  import { useRouter } from 'vue-router'
  import RelatedDataCard from '../../components/ui/RelatedDataCard.vue'
  import BioProjectsCard from '../../components/ui/BioProjectsCard.vue'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()  
  const router = useRouter()
  const showData = ref(false)
  const error = ref('')
  const props = defineProps({
    accession: String,
  })

  const bioprojects = ref([])
  watch(
    () => props.accession,
    async (value) => {
      try {
        showData.value = false
        getBioSample(await BioSampleService.getBioSample(props.accession))
        bioprojects.value = [...(await BioSampleService.getBioSampleBioProjects(props.accession)).data]
        showData.value = true
      } catch (e) {
        error.value = props.accession + ' ' + e.response.data.message
        showData.value = false
      }
    },
  )
  const relatedData = [
    {
      title: 'uiComponents.relatedDataCard.biosamples',
      icon: 'hubs',
      key: 'sub_samples',
      route: 'biosample',
      columns: ['accession', 'organism_part'],
    },
    {
      title: 'uiComponents.relatedDataCard.experiments',
      icon: 'widgets',
      key: 'experiments',
      route: 'experiment',
      columns: ['experiment_accession', 'instrument_platform'],
    },
    {
      title: 'uiComponents.relatedDataCard.assemblies',
      icon: 'library_books',
      key: 'assemblies',
      route: 'assembly',
      columns: ['accession', 'assembly_name', 'assembly_level'],
    },
  ]
  const biosample = ref({})

  const validData = ref([])

  onMounted(async () => {
    try {
      getBioSample(await BioSampleService.getBioSample(props.accession))
      bioprojects.value = [...(await BioSampleService.getBioSampleBioProjects(props.accession)).data]
      showData.value = true
    } catch (e) {
      error.value = props.accession + ' ' + e.response.data.message
      showData.value = false
    }
  })

  function getBioSample({ data }: AxiosResponse) {
    biosample.value = { ...data }
    validData.value = relatedData.filter(
      (data) => Object.keys(biosample.value).includes(data.key) && biosample.value[data.key].length,
    )
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

  .list__item + .list__item {
    margin-top: 10px;
  }
</style>
