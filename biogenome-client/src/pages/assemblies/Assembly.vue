<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'assemblies' }" :label="t('assemblyDetails.breadcrumb')" />
    <va-breadcrumbs-item active :label="accession" />
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
    <KeyValueCard v-if="assemblySelectedMetadata.length && metadata" :metadata="metadata"
      :selected-metadata="assemblySelectedMetadata" />
    <!-- TODO add ideogram -->
    <!-- <Ideogram v-if="assembly && assembly.taxid && hasChromosomes" :taxid="assembly.taxid" :accession="accession" /> -->
    <div class="row row-equal">
      <!-- <div v-if="hasChromosomes" class="flex lg12 md12 sm12 xs12">
        <va-collapse v-model="showJBrowse" flat header="Genome Browser" color="#721e63">
          <KeepAlive>
            <Jbrowse2 :assembly="assembly" :annotations="annotations" />
          </KeepAlive>
        </va-collapse>
      </div> -->
      <div v-if="metadata && Object.keys(metadata).length" class="flex lg12 md12 sm12 xs12">
        <va-collapse v-model="showMetadata" header="Metadata" flat color="secondary">
          <MetadataTreeCard :metadata="metadata" />
        </va-collapse>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import AssemblyService from '../../services/clients/AssemblyService'
import { onMounted, ref } from 'vue'
import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
import { Assembly, Details, TrackData } from '../../data/types'
import { useI18n } from 'vue-i18n'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import KeyValueCard from '../../components/ui/KeyValueCard.vue'
import { assemblySelectedMetadata } from "../../../config.json";
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
// import Ideogram from '../../components/ui/Ideogram.vue'

const showJBrowse = ref(true)
const showMetadata = ref(false)
const { t } = useI18n()
const metadata = ref<Record<string, any> | null>(null)
const props = defineProps<{
  accession: string
}>()
const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
const details = ref<
  Details | any
>()
const assembly = ref<Assembly>()
const annotations = ref<TrackData[]>([])
const hasChromosomes = ref(false)
onMounted(async () => {
  try {

    isLoading.value = true
    const { data } = await AssemblyService.getAssembly(props.accession)
    assembly.value = { ...data }
    details.value = parseDetails(data)
    if (data.metadata) metadata.value = data.metadata
    hasChromosomes.value = data && data.chromosomes.length
    if (hasChromosomes.value) {
      const { data } = await AssemblyService.getRelatedAnnotations(props.accession)
      annotations.value = data
    }
  } catch (e) {
    errorMessage.value = e
  } finally {
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
  if (assembly.blobtoolkit_id) details.blobtoolkit = assembly.blobtoolkit_id
  return details
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
