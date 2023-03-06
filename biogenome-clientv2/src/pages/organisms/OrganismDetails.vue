<template>
  <div v-if="showData">
    <div class="row row-equal justify-space-between">
      <div class="flex">
        <h1 class="va-h1">{{ organism.scientific_name }}</h1>
        <p v-if="organism.insdc_common_name">{{ organism.insdc_common_name }}</p>
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
      <!-- <div v-if="organism.local_samples.length" class="flex">
          <va-card class="mb-4" color="warning">
            <va-card-content>
              <h2 class="va-h4 ma-0" style="color: white">{{ organism.local_samples.length }}</h2>
              <p style="color: white">Local Samples</p>
            </va-card-content>
          </va-card>
        </div>
        <div v-if="organism.biosamples.length" class="flex">
          <va-card class="mb-4" color="success">
            <va-card-content>
              <h2 class="va-h4 ma-0" style="color: white">{{ organism.biosamples.length }}</h2>
              <p style="color: white">BioSamples</p>
            </va-card-content>
          </va-card>
        </div>
        <div v-if="organism.experiments.length" class="flex">
          <va-card class="mb-4" color="primary">
            <va-card-content>
              <h2 class="va-h4 ma-0" style="color: white">{{ organism.experiments.length }}</h2>
              <p style="color: white">Reads</p>
            </va-card-content>
          </va-card>
        </div>
        <div v-if="organism.assemblies.length" class="flex">
          <va-card class="mb-4" color="secondary">
            <va-card-content>
              <h2 class="va-h4 ma-0" style="color: white">{{ organism.assemblies.length }}</h2>
              <p style="color: white">Assemblies</p>
            </va-card-content>
          </va-card>
        </div>
        <div v-if="organism.annotations.length" class="flex">
          <va-card class="mb-4" color="secondary">
            <va-card-content>
              <h2 class="va-h4 ma-0" style="color: white">{{ organism.annotations.length }}</h2>
              <p style="color: white">Annotations</p>
            </va-card-content>
          </va-card>
        </div> -->
      <div class="flex lg6 md6 sm12 xs12">
        <va-card>
          <va-card-title> taxonomic lineage </va-card-title>
          <va-card-content>
            <va-chip v-for="(taxon, index) in taxons" :key="index" flat>{{ taxon.name }}</va-chip>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="relatedData.length" class="flex lg6 md6 sm12 xs12">
        <Suspense>
          <RelatedDataCard
            :id="organism.taxid"
            :request="OrganismService.getOrganismRelatedData"
            :related-data="relatedData"
          />
        </Suspense>
      </div>
    </div>

    <div class="row row-equal"></div>
    <div class="row row-equal">
      <div v-if="organism.image_urls.length" class="flex lg4 md4">
        <va-card>
          <va-card-title> Images </va-card-title>
          <va-carousel stateful :items="organism.image_urls"> </va-carousel>
        </va-card>
      </div>

      <div v-if="organism.publications.length" class="flex"></div>
      <div v-if="organism.bioprojects.length" class="flex">
        <va-card>
          <va-card-title> bioprojects </va-card-title>
          <va-card-content>
            <div v-for="(bp, index) in bioprojects" :key="index" style="padding: 0.5rem">
              <b class="display-6">{{ bp.title }}</b>
              <p class="text--secondary mb-0">{{ bp.accession }}</p>
            </div>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="organism.common_names.length" class="flex"></div>
      <div v-if="Object.keys(organism.metadata).length" class="flex">
        <va-card>
          <va-card-title> metadata </va-card-title>
          <va-card-content>
            <Metadata :metadata="organism.metadata" />
          </va-card-content>
        </va-card>
      </div>
    </div>
    <!-- <div class="row row-equal">
        <div class="flex lg6 md6 sm12 xs12">
          <va-card-title>metatada</va-card-title>
          <va-card-content style="max-height: 350px; overflow-y: scroll">
            <Metadata :metadata="biosample.metadata" />
          </va-card-content>
        </div>
        <div
          v-if="biosample.latitude && biosample.longitude && Number(biosample.latitude) && Number(biosample.longitude)"
          class="flex lg6 md6 sm12 xs12"
        >
          <va-card>
            <LeafletMap
              :latitude="Number(biosample.latitude)"
              :longitude="Number(biosample.longitude)"
              :html="`${biosample.accession}`"
            />
          </va-card>
        </div>
      </div> -->
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

  const showData = ref(false)
  const error = ref('')
  const props = defineProps({
    taxid: String,
  })
  const taxons = ref([])
  const bioprojects = ref([])
  const organism = ref({})
  const relatedData = ref([])

  const models = [
    {
      title: 'BioSamples',
      icon: 'hubs',
      key: 'biosamples',
      route: 'biosample',
      columns: ['accession', 'organism_part'],
    },
    {
      title: 'Local Samples',
      icon: 'hubs',
      key: 'local_samples',
      route: 'local-sample',
      columns: ['local_id'],
    },
    {
      title: 'Reads',
      icon: 'widgets',
      key: 'experiments',
      route: 'read',
      columns: ['experiment_accession', 'instrument_platform'],
    },
    {
      title: 'Assemblies',
      icon: 'library_books',
      key: 'assemblies',
      route: 'assembly',
      columns: ['accession', 'assembly_name', 'assembly_level'],
    },
    {
      title: 'Annotations',
      icon: 'library_books',
      key: 'annotations',
      route: 'annotation',
      columns: ['name', 'assembly_name'],
    },
  ]

  onMounted(async () => {
    try {
      const { data } = await OrganismService.getOrganism(props.taxid)
      organism.value = { ...data }
      taxons.value = (await OrganismService.getOrganismLineage(props.taxid)).data
      const unorderedBioProjects: [] = (await OrganismService.getOrganismBioprojects(props.taxid)).data
      bioprojects.value = unorderedBioProjects.sort((a, b) => {
        if (b.children && b.children.includes(a.accession)) {
          return -1
        }
        return 1
      })
      relatedData.value = models.filter(
        (m) => Object.keys(organism.value).includes(m.key) && organism.value[m.key].length,
      )
      showData.value = true
    } catch (e) {
      error.value = props.taxid + ' ' + e.response.data.message
      showData.value = false
    }
  })
</script>

<style scoped lang="scss">
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
