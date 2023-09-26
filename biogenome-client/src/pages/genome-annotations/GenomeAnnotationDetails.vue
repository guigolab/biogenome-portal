<template>
  <div>
   <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'annotations' }" :label="t('annotationDetails.breadcrumb')" />
      <va-breadcrumbs-item
        active
        :label="router.currentRoute.value.params.name"
      />
    </va-breadcrumbs>
    <va-divider />
    <div v-if="Object.keys(annotation).length">
      <div class="row row-equal justify-space-between">
        <div class="flex">
          <h1 class="va-h1">{{ annotation.name }}</h1>
          <div class="row">
            <div class="flex">
              <va-button preset="primary" icon="pets" :to="{ name: 'organism', params: { taxid: annotation.taxid } }">{{
                annotation.scientific_name
              }}</va-button>
            </div>
            <div class="flex">
              <va-button
                :to="{ name: 'assembly', params: { accession: annotation.assembly_accession } }"
                preset="primary"
                icon="fa-dna"
                >{{ annotation.assembly_name }}</va-button
              >
            </div>
          </div>
        </div>
      </div>
      <div class="row row-equal">
        <div v-if="showJBrowse" class="flex lg12 md12 sm12 xs12">
          <va-card-title> {{ t('annotationDetails.genomeBrowser') }} </va-card-title>
          <va-card-content>
            <Jbrowse2 :assembly="jbrowse.assembly" :tracks="jbrowse.annotations"/>
          </va-card-content>
        </div>
        <div v-if="annotation.metadata && Object.keys(annotation.metadata).length" class="flex lg12 md12 sm12 xs12">
          <va-card-title>{{t('uiComponents.metadata')}}</va-card-title>
          <va-card-content>
            <Metadata :metadata="annotation.metadata" />
          </va-card-content>
        </div>
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
    import AnnotationService from '../../services/clients/AnnotationService'
    import { useI18n } from 'vue-i18n'
    const { t } = useI18n()

    const router = useRouter()
    const annotation = ref({})
    const assembly = ref({})
    const props = defineProps({
      name: String,
    })
  
    const jbrowse = reactive({
      assembly: {},
      annotations: []
    })
    const showJBrowse = ref(false)

    onMounted(async () => {
      const {data} = await AnnotationService.getAnnotation(props.name)
      annotation.value = {...data}
      getAssembly(await AssemblyService.getAssembly(annotation.value.assembly_accession))
    })
  
    function getAssembly({ data }: AxiosResponse) {
      assembly.value = {...data}
      if (data.chromosomes.length) {
        const assemblyAdapter: AssemblyAdapter = {
          name: data.assembly_name,
          sequence: {
            name: data.assembly_name || data.accession,
            trackId: data.accession,
            type: 'ReferenceSequenceTrack',
            adapter: {
              type: 'RefGetAdapter',
              sequenceData: {},
            },
          },
        }
        data.chromosomes.forEach((chr) => {
          const key = 'insdc:' + chr.accession_version
          assemblyAdapter.sequence.adapter.sequenceData[key] = {
            name: chr.metadata.name,
            size: Number(chr.metadata.length),
          }
        })
        jbrowse.assembly = { ...assemblyAdapter }
        const track = {
            type: "FeatureTrack",
            trackId:annotation.value.name,
            name: annotation.value.name,
            assemblyNames: [data.assembly_name || data.accession],
            category: ["Genes"],
            adapter: {
                type: "Gff3TabixAdapter",
                gff_gz_location: {
                    uri: annotation.value.gff_gz_location,
                    locationType: "UriLocation"
                },
                index: {
                    location: {
                        uri: annotation.value.tab_index_location,
                        locationType: "UriLocation"
                    }
                }
            }
        }
        jbrowse.annotations.push({...track})
        showJBrowse.value = true

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
  
    .list__item + .list__item {
      margin-top: 10px;
    }
  </style>
  