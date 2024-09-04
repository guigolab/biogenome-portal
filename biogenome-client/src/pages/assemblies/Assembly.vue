<template>
  <DetailsHeader :details="details" />
  <div v-if="validTabs.length">
    <Tabs :tabs="validTabs" :tab="tab" @updateView="(v: string) => tab = v" />
    <div class="row">
      <div class="flex lg12 md12 sm12 xs12">
        <ChromosomesTable v-if="tab === 'chromosomes'" :items="chromosomes" />
        <AnnotationsTable v-else-if="tab === 'annotations'" :items="annotations" />
        <Jbrowse2 v-else-if="tab === 'jbrowse'" :assembly="assembly" :annotations="annotations" />
        <MetadataTreeCard v-else-if="assembly" :metadata="Object.entries(assembly.metadata)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AssemblyService from '../../services/clients/AssemblyService'
import { ref, watchEffect } from 'vue'
import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
import { Assembly, Details, TrackData } from '../../data/types'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import Tabs from '../../components/common/Tabs.vue'
import ChromosomesTable from './components/ChromosomesTable.vue'
import AnnotationsTable from './components/AnnotationsTable.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'

const { init } = useToast()

const props = defineProps<{
  accession: string
}>()

const details = ref<
  Details | any
>()

const tab = ref('')
const assembly = ref<Assembly>()
const annotations = ref<TrackData[]>([])
const chromosomes = ref<Record<string, any>[]>([])

const validTabs = ref<{ label: string, name: string }[]>([])


watchEffect(async () => {
  await getData(props.accession)
})

async function getData(accession: string) {
  try {
    await getAssembly(accession)
    await getRelatedAnnotations(accession)
    await getRelatedChromosomes(accession)
    setValidTabs()
  } catch (error) {
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

function setValidTabs() {
  const tabs = [{ name: 'metadata', label: 'tabs.metadata' }];

  if (annotations.value.length) {
    tabs.push({ name: 'annotations', label: 'tabs.annotations' });
  }

  if (chromosomes.value.length) {
    tabs.push({ name: 'chromosomes', label: 'tabs.chromosomes' });

    // Adding 'jbrowse' only if 'chromosomes' are present.
    tabs.push({ name: 'jbrowse', label: 'tabs.jbrowse' });
  }
  return tabs;
}

async function getAssembly(accession: string) {
  const { data } = await AssemblyService.getAssembly(accession)
  details.value = { ...parseDetails(data) }
  assembly.value = { ...data }
}
async function getRelatedAnnotations(accession: string) {
  const { data } = await AssemblyService.getRelatedAnnotations(accession)
  annotations.value = [...data]
}

async function getRelatedChromosomes(accession: string) {
  const { data } = await AssemblyService.getRelatedChromosomes(accession)
  chromosomes.value = [...data]
}

function parseDetails(assembly: Assembly) {
  const accession = assembly.accession
  const details: Details = {
    title: assembly.assembly_name,
    description: accession,
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