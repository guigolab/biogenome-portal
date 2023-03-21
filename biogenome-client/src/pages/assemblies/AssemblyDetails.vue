<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'assemblies' }" label="assemblies" />
    <va-breadcrumbs-item
      v-if="router.currentRoute.value.name === 'assembly'"
      active
      :label="router.currentRoute.value.params.accession"
    />
  </va-breadcrumbs>
  <va-divider />
  <div v-if="assembly.metadata">
    <div class="row row-equal justify-space-between">
      <div class="flex">
        <h1 class="va-h1">{{ assembly.assembly_name }}</h1>
        <div class="row">
          <div class="flex">
            <va-button preset="primary" icon="pets" :to="{ name: 'organism', params: { taxid: assembly.taxid } }">{{
              assembly.scientific_name
            }}</va-button>
          </div>
          <div class="flex">
            <va-button
              :to="{ name: 'biosample', params: { accession: assembly.sample_accession } }"
              preset="primary"
              icon="hub"
              >{{ assembly.sample_accession }}</va-button
            >
          </div>
        </div>
      </div>
      <div class="flex">
        <div class="row row-equal align-center">
          <div class="flex">
            <a target="_blank" :href="`https://www.ncbi.nlm.nih.gov/assembly/${assembly.accession}`">
              <va-avatar size="large">
                <img :src="'/ncbi.png'" />
              </va-avatar>
            </a>
          </div>
          <div class="flex">
            <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${assembly.accession}`">
              <va-avatar size="large">
                <img :src="'/ena.jpeg'" />
              </va-avatar>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="row row-equal">
      <div class="flex">
        <va-card class="mb-4" color="danger">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ assembly.metadata.contig_n50 }}</h2>
            <p style="color: white">Contig n50</p>
          </va-card-content>
        </va-card>
      </div>
      <div class="flex">
        <va-card class="mb-4" color="info">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ assembly.metadata.estimated_size }}</h2>
            <p style="color: white">genome size</p>
          </va-card-content>
        </va-card>
      </div>
      <div class="flex">
        <va-card class="mb-4" color="warning">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ assembly.metadata.assembly_level }}</h2>
            <p style="color: white">assembly level</p>
          </va-card-content>
        </va-card>
      </div>
      <div v-if="assembly.chromosomes.length" class="flex">
        <va-card class="mb-4" color="primary">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ assembly.chromosomes.length }}</h2>
            <p style="color: white">chromosomes</p>
          </va-card-content>
        </va-card>
      </div>
      <div class="flex">
        <va-card class="mb-4" color="secondary">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ assembly.metadata.submitter }}</h2>
            <p style="color: white">submitter</p>
          </va-card-content>
        </va-card>
      </div>
      <div class="flex">
        <va-card class="mb-4" color="success">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ assembly.metadata.submission_date }}</h2>
            <p style="color: white">submission date</p>
          </va-card-content>
        </va-card>
      </div>
    </div>
    <div class="row row-equal">
      <div v-if="showJBrowse" class="flex lg12 md12 sm12 xs12">
        <va-card-title> genome browser </va-card-title>
        <va-card-content>
          <Jbrowse2 :assembly="jbrowse.assembly" :tracks="jbrowse.annotations"/>
        </va-card-content>
      </div>
      <div class="flex lg12 md12 sm12 xs12">
        <va-card-title>metatada</va-card-title>
        <va-card-content>
          <Metadata :metadata="assembly.metadata" />
        </va-card-content>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import AssemblyService from '../../services/clients/AssemblyService'
  import { onMounted, reactive, ref } from 'vue'
  import { AxiosResponse } from 'axios'
  import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
  import { AssemblyAdapter } from '../../data/types'
  import Metadata from '../../components/ui/Metadata.vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()
  const props = defineProps({
    accession: String,
  })

  const assembly = ref({})
  const jbrowse = reactive({
    assembly: {},
    annotations: []
  })
  const showJBrowse = ref(false)
  onMounted(async () => {
    getAssembly(await AssemblyService.getAssembly(props.accession))
    await getAnnotations()
    if(Object.keys(jbrowse.assembly).length) showJBrowse.value = true
    console.log(Object.keys(jbrowse.assembly).length)
  })

  function getAssembly({ data }: AxiosResponse) {
    assembly.value = { ...data }
    if (assembly.value.chromosomes.length) {
      const assemblyAdapter: AssemblyAdapter = {
        name: assembly.value.assembly_name,
        sequence: {
          name: assembly.value.assembly_name,
          trackId: assembly.value.accession,
          type: 'ReferenceSequenceTrack',
          adapter: {
            type: 'RefGetAdapter',
            sequenceData: {},
          },
        },
      }
      assembly.value.chromosomes.forEach((chr) => {
        const key = 'insdc:' + chr.accession_version
        assemblyAdapter.sequence.adapter.sequenceData[key] = {
          name: chr.metadata.name,
          size: Number(chr.metadata.length),
        }
      })
      jbrowse.assembly = { ...assemblyAdapter }
    }
  }

  async function getAnnotations(){
    const {data} = await AssemblyService.getRelatedAnnotations(props.accession)
    if(!data.length) return
    data.forEach(d => {
      const track = {
            type: "FeatureTrack",
            trackId:d.name,
            name: d.name,
            assemblyNames: [assembly.value.assembly_name],
            category: ["Genes"],
            adapter: {
                type: "Gff3TabixAdapter",
                gffGzLocation: {
                    uri: d.gff_gz_location,
                    locationType: "UriLocation"
                },
                index: {
                    location: {
                        uri: d.tab_index_location,
                        locationType: "UriLocation"
                    }
                }
            }
        }
        jbrowse.annotations.push({...track})
    })

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
