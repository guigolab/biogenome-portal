<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'assemblies' }" :label="t('assemblyDetails.breadcrumb')" />
    <va-breadcrumbs-item active :label="accession" />
  </va-breadcrumbs>
  <va-divider />
  <Transition>
    <DetailsHeader v-if="details" :details="details" />
  </Transition>
  <Transition>
    <KeyValueCard v-if="metadata" :metadata="metadata" :selected-metadata="assemblySelectedMetadata" />
  </Transition>
  <div id="ideo-container"></div>
  <va-tabs v-model="tabValue" grow>
    <template #tabs>
      <va-tab v-for="(tab, index) in tabs" :key="index" :name="tab">
        {{ t(tab) }}
      </va-tab>
    </template>
  </va-tabs>
  <div class="row row-equal">
    <div v-if="tabValue === 'assemblyDetails.genomeBrowser'" class="flex lg12 md12 sm12 xs12">
      <va-inner-loading :loading="!showJBrowse">
        <va-card-content>
          <Jbrowse2 :assembly="jbrowse.assembly" :tracks="jbrowse.annotations" />
        </va-card-content>
      </va-inner-loading>
    </div>
    <div v-else class="flex lg12 md12 sm12 xs12">
      <va-card-content>
        <Metadata :metadata="metadata" />
      </va-card-content>
    </div>
  </div>
</template>
<script setup lang="ts">
import AssemblyService from '../../services/clients/AssemblyService'
import { onMounted, reactive, ref } from 'vue'
import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
import { AssemblyAdapter, Assembly, Details } from '../../data/types'
import Metadata from '../../components/ui/Metadata.vue'
import { useI18n } from 'vue-i18n'
import { assembliesBc } from './configs'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import KeyValueCard from '../../components/ui/KeyValueCard.vue'
import { assemblySelectedMetadata } from "../../../config.json";
// import Ideogram from 'ideogram'

const { t } = useI18n()
const tabs = ref([
  'uiComponents.metadata',
])
const tabValue = ref(tabs.value[0])
const metadata = ref<Record<string, any>>()
const props = defineProps<{
  accession: string
}>()
const isLoading = ref(false)
const bcs = [...assembliesBc]
bcs.push(
  {
    name: props.accession,
    path: { name: 'assemblies', params: { accession: props.accession } },
    active: true
  }
)
const details = ref<
  Details | any
>()

const jbrowse = reactive<
  Record<string, any>
>({
  assembly: {},
  annotations: []
})
const showJBrowse = ref(false)

onMounted(async () => {
  try {

    isLoading.value = true
    const { data } = await AssemblyService.getAssembly(props.accession)
    // new Ideogram({
    //   organism: data.taxid,
    //   assembly: props.accession,
    //   container: '#ideo-container'
    // })
    details.value = parseDetails(data)
    metadata.value = data.metadata
    if (data && data.chromosomes.length) {
      parseAssembly(data)
      await getAnnotations(data.assembly_name)
      tabs.value.push('assemblyDetails.genomeBrowser')
      showJBrowse.value = true
    }
    isLoading.value = false
  } catch {
    isLoading.value = false
  }
})

function parseDetails(assembly: Assembly) {
  const accession = assembly.accession
  const details: Details = {
    title: assembly.assembly_name,
    button1: {
      route: { name: 'organism', params: { taxid: assembly.taxid } },
      label: assembly.scientific_name
    },
    button2: {
      route: { name: 'biosample', params: { accession: assembly.sample_accession } },
      label: assembly.sample_accession,
    },
    ncbiPath: `https://www.ncbi.nlm.nih.gov/assembly/${accession}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${accession}`
  }
  return details
}
function parseAssembly(assembly: Assembly) {
  const assemblyAdapter: AssemblyAdapter = {
    name: assembly.assembly_name,
    sequence: {
      name: assembly.assembly_name,
      trackId: assembly.accession,
      type: 'ReferenceSequenceTrack',
      adapter: {
        type: 'RefGetAdapter',
        sequenceData: {},
      },
    },
  }
  assembly.chromosomes.forEach((chr) => {
    const key = 'insdc:' + chr.accession_version
    assemblyAdapter.sequence.adapter.sequenceData[key] = {
      name: chr.metadata.name,
      size: Number(chr.metadata.length),
    }
  })
  jbrowse.assembly = { ...assemblyAdapter }
}

function setDefaultSession() {
  const defaultSession = {
    name: 'My session',
    view: {
      id: 'linearGenomeView',
      type: 'LinearGenomeView',
      tracks: [
        {
          // the first track displayed
        },
        {
          // the second track displayed
        },
        {
          // ...
        },
      ],
    },
  }
}

async function getAnnotations(assemblyName: string) {
  const { data } = await AssemblyService.getRelatedAnnotations(props.accession)
  if (!data.length) return
  data.forEach((d: { name: any; gff_gz_location: any; tab_index_location: any }) => {
    const track = {
      type: "FeatureTrack",
      trackId: d.name,
      name: d.name,
      assemblyNames: [assemblyName],
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
    jbrowse.annotations.push({ ...track })
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

.list__item+.list__item {
  margin-top: 10px;
}
#ideo-container {
    height: 300px;
    width: 50%;
    margin: auto;
  }
</style>
