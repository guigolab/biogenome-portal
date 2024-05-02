<template>
  <div :key="props.accession">
    <DetailsHeader :details="details" />
    <VaTabs v-model="tab">
      <template #tabs>
        <VaTab label="Metadata" name="metadata"></VaTab>
        <VaTab v-if="hasChromosomes" label="Genome Browser" name="jbrowse"></VaTab>
      </template>
    </VaTabs>
    <VaDivider></VaDivider>
    <div class="row" v-if="tab === 'metadata'">
      <div v-if="metadata && Object.keys(metadata).length" class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
    </div>
    <div v-else class="row">
      <div class="flex lg12 md12 sm12 xs12">
        <Jbrowse2 :assembly="assembly" :annotations="annotations" />
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
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
// import Ideogram from '../../components/ui/Ideogram.vue'

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

const tab = ref('metadata')
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
