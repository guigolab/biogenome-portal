<template>
  <DetailsHeader :details="details" />
  <div v-if="validTabs.length">
    <Tabs :tabs="validTabs" :tab="tab" @updateView="(v: string) => tab = v" />
    <div class="row">
      <div class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard v-if="tab === 'metadata'" :metadata="experiment ? Object.entries(experiment.metadata) : []" />
        <ReadsTable v-else :items="reads" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import ExperimentService from '../../services/clients/ExperimentService'
import { computed, ref, watchEffect } from 'vue'
import { Details } from '../../data/types'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import Tabs from '../../components/common/Tabs.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'
import ReadsTable from './components/ReadsTable.vue'

const { init } = useToast()
const props = defineProps<{
  accession: string
}>()

const experiment = ref<Record<string, any>>()
const tab = ref('')
const details = ref<
  Details | any
>()

const reads = ref<Record<string, any>[]>([])

const validTabs = ref<{ label: string, name: string }[]>([])

watchEffect(async () => {
  await getData(props.accession)
})

async function getData(accession: string) {
  try {
    await getExperiment(accession)
    await getReads(accession)
    setTabs()
  } catch (error) {
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

function setTabs() {
  const tabs = [{ name: 'metadata', label: 'tabs.metadata' }];

  if (reads.value.length) {
    tabs.push({ name: 'reads', label: 'tabs.reads' });
  }

  return tabs;
}
async function getExperiment(accession: string) {
  const { data } = await ExperimentService.getExperiment(accession)
  experiment.value = { ...data }
  details.value = { ...parseDetails(data) }
}

async function getReads(accession: string) {
  const { data } = await ExperimentService.getReadsByExperiment(accession)
  reads.value = [...data]
}

function parseDetails(experiment: Record<string, any>) {
  const expAccession = experiment.experiment_accession
  const sampleAccession = experiment.sample_accession || experiment.metadata.sample_accession
  console.log(sampleAccession)

  const details: Details = {
    title: expAccession,
    description: experiment.metadata.experiment_title,
    button1: {
      route: { name: 'organism', params: { taxid: experiment.taxid } },
      label: experiment.scientific_name || experiment.metadata.scientific_name
    },
    button2: {
      route: { name: 'biosample', params: { accession: sampleAccession } },
      label: sampleAccession
    },
    ncbiPath: `https://www.ncbi.nlm.nih.gov/sra/${expAccession}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${expAccession}`
  }
  return details
}


</script>
