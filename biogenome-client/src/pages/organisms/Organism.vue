<template>
  <div v-if="showData">
    <div class="row row-equal justify-space-between">
      <div class="flex">
        <div class="row align-center">
          <div class="flex">
            <h1 class="va-h1">{{ organism.scientific_name }}</h1>
            <p v-if="organism.insdc_common_name">{{ organism.insdc_common_name }}</p>
          </div>
        </div>
      </div>
      <div class="flex">
        <div class="row row-equal align-center">
          <div class="flex">
            <a target="_blank" :href="`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${organism.taxid}`">
              <va-avatar size="large">
                <img :src="'/ncbi.png'" />
              </va-avatar>
            </a>
          </div>
          <div class="flex">
            <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${organism.taxid}`">
              <va-avatar size="large">
                <img :src="'/ena.jpeg'" />
              </va-avatar>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="row row-equal">
      <div class="flex lg12 md12 sm12 xs12">
        <va-chip :to="{ name: 'taxon', params: { taxid: taxon.taxid } }" v-for="(taxon, index) in taxons" :key="index"
          flat>{{
            taxon.name }}</va-chip>
      </div>
    </div>
    <div class="row row-equal">
      <div v-if="organism.local_samples.length" class="flex">
        <va-card class="mb-4" color="warning">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ organism.local_samples.length }}</h2>
            <p style="color: white">{{ t('modelStats.localSamples') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="organism.biosamples.length" class="flex">
        <va-card class="mb-4" color="success">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ organism.biosamples.length }}</h2>
            <p style="color: white">{{ t('modelStats.biosamples') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="organism.experiments.length" class="flex">
        <va-card class="mb-4" color="primary">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ organism.experiments.length }}</h2>
            <p style="color: white">{{ t('modelStats.experiments') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="organism.assemblies.length" class="flex">
        <va-card class="mb-4" color="secondary">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ organism.assemblies.length }}</h2>
            <p style="color: white">{{ t('modelStats.assemblies') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="organism.annotations.length" class="flex">
        <va-card class="mb-4" color="secondary">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ organism.annotations.length }}</h2>
            <p style="color: white">{{ t('modelStats.annotations') }}</p>
          </va-card-content>
        </va-card>
      </div>
    </div>
    <div class="row row-equal">
      <div v-if="organism.image_urls.length" class="flex lg6 md6 sm12 xs12">
        <va-card>
          <va-image fit :src="organism.image_urls[currentImageIndex]" style="height: 300px" />
          <va-card-title>
            <va-button preset="plain" icon-right="fa-arrow-circle-right" @click="showModal">
              {{ t('dashboard.info.exploreGallery') }}
            </va-button>
          </va-card-title>
        </va-card>
        <va-modal size="large" v-model="modal">
          <va-carousel height="400" lazy fit="contain" v-model="currentImageIndex" :items="organism.image_urls" class="gallery-carousel" />
        </va-modal>
      </div>
      <div v-if="relatedData.length" class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <RelatedDataCard :id="organism.taxid" :request="OrganismService.getOrganismRelatedData"
            :related-data="relatedData" />
        </Suspense>
      </div>
      <div v-if="coordinates && coordinates.length" class="flex lg6 md6 sm12 xs12">
        <va-card style="min-height: 300px">
          <LeafletMap :coordinates="coordinates" />
        </va-card>
      </div>
      <div v-if="organism.publications.length" class="flex lg6 md6 sm12 xs12">
        <va-card>
          <va-card-content>
            <va-list>
              <va-list-label> {{ t('organismDetails.publications') }} </va-list-label>

              <va-list-item v-for="(pub, index) in organism.publications" :key="index" class="list__item"
                :href="getLink(pub)" target="_blank">
                <va-list-item-section>
                  <va-list-item-label>
                    <strong>{{ pub.source }}</strong>
                  </va-list-item-label>
                </va-list-item-section>
                <va-list-item-section>
                  <va-list-item-label>
                    {{ pub.id }}
                  </va-list-item-label>
                </va-list-item-section>
              </va-list-item>
            </va-list>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="organism.common_names.length" class="flex lg6 md6 sm12 xs12">
        <va-card>
          <va-card-content>
            <va-list>
              <va-list-label> {{ t('organismDetails.vernacularNames') }} </va-list-label>

              <va-list-item v-for="(name, index) in organism.common_names" :key="index" class="list__item">
                <va-list-item-section>
                  <va-list-item-label>
                    {{ name.value }}
                  </va-list-item-label>
                </va-list-item-section>
                <va-list-item-section>
                  <va-list-item-label>
                    <va-chip flat icon="language">{{ name.lang }}</va-chip>
                  </va-list-item-label>
                </va-list-item-section>
                <va-list-item-section>
                  <va-list-item-label>
                    <va-chip flat icon="location_on">{{ name.locality }}</va-chip>
                  </va-list-item-label>
                </va-list-item-section>
              </va-list-item>
            </va-list>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="Object.keys(organism.metadata).length" class="flex lg6 md6 sm12 xs12">
        <va-card>
          <va-card-title> {{ t('uiComponents.metadata') }} </va-card-title>
          <va-card-content>
            <Metadata :metadata="organism.metadata" />
          </va-card-content>
        </va-card>
      </div>
    </div>
  </div>
  <div v-else>
    <h3 class="va-h3">
      {{ error }}
    </h3>
  </div>
</template>
<script setup lang="ts">
import OrganismService from '../../services/clients/OrganismService'
import { onMounted, ref } from 'vue'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Metadata from '../../components/ui/Metadata.vue'
import RelatedDataCard from '../../components/ui/RelatedDataCard.vue'
import { useI18n } from 'vue-i18n'
const modal = ref(false)
const currentImageIndex = ref(0)
const { t } = useI18n()

const showData = ref(false)
const error = ref('')
const props = defineProps({
  taxid: String,
})
const taxons = ref([])
const organism = ref({})
const relatedData = ref([])
const coordinates = ref([])

function showModal() {
  modal.value = true
}
onMounted(async () => {
  try {
    const { data } = await OrganismService.getOrganism(props.taxid)
    organism.value = { ...data }
    taxons.value = (await OrganismService.getOrganismLineage(props.taxid)).data
    relatedData.value = models.filter(
      (m) => Object.keys(organism.value).includes(m.key) && organism.value[m.key].length,
    )
    if (organism.value.biosamples.length) {
      const { data } = await OrganismService.getOrganismRelatedData(props.taxid, 'biosamples')
      const biosampleCoords = data.filter(b => b.location && b.location.coordinates && (Number(b.location.coordinates[1]) && Number(b.location.coordinates[0])))
        .map(b => {
          return {
            latitude: Number(b.location.coordinates[1]),
            longitude: Number(b.location.coordinates[0]),
            id: b.accession,
            taxid: b.taxid
          }
        })
      if (biosampleCoords.length) {
        coordinates.value.push(...biosampleCoords)
      }
      if (organism.value.local_samples.length) {
        const { data } = await OrganismService.getOrganismRelatedData(props.taxid, 'local_samples')
        const localsampleCoords = data.filter(b => b.location && b.location.coordinates && (Number(b.location.coordinates[1]) && Number(b.location.coordinates[0])))
          .map(b => {
            return {
              latitude: Number(b.location.coordinates[1]),
              longitude: Number(b.location.coordinates[0]),
              id: b.accession,
              taxid: b.taxid
            }
          })
        if (localsampleCoords.length) {
          coordinates.value.push(...localsampleCoords)
        }
      }
    }
    showData.value = true
  } catch (e) {
    console.log(e)
    if (e.response) {
      error.value = props.taxid + ' ' + e.response.data.message
    }
    showData.value = false
  }
})


function getLink(publication) {
  if (publication.source === 'DOI') {
    return `https://doi.org/${publication.id}`
  } else if (publication.source === 'PubMed ID') {
    return `https://pubmed.ncbi.nlm.nih.gov/${publication.id}`
  } else {
    return `http://www.ncbi.nlm.nih.gov/pmc/articles/${publication.id}`
  }
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
