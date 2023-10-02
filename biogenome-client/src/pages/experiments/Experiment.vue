<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'experiments' }" label="experiments" />
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
    <KeyValueCard v-if="experimentSelectedMetadata.length && metadata" :metadata="metadata" :selected-metadata="experimentSelectedMetadata" />
    <div class="row row-equal">
      <div v-if="metadata && Object.keys(metadata).length" class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import ReadService from '../../services/clients/ReadService'
import { onMounted, ref } from 'vue'
import { Details } from '../../data/types'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import KeyValueCard from '../../components/ui/KeyValueCard.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import {experimentSelectedMetadata} from '../../../config.json'
const props = defineProps<{
  accession:string
}>()

const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
const details = ref<
  Details | any
>()
const metadata = ref<Record<string, any> | null>(null)

onMounted(async () => {
  await getRead(props.accession)
})

async function getRead(accession:string) {
  try{
    isLoading.value = true
    const {data} = await ReadService.getRead(accession)
    details.value = {...parseDetails(data)}
    if(data.metadata) metadata.value = {...data.metadata}
  }catch(e){
    errorMessage.value = e
  }finally{
    isLoading.value = false
  }
}
function parseDetails(experiment: Record<string,any>) {
  const accession = experiment.experiment_accession
  const details: Details = {
    title: accession,
    button1: {
      route: { name: 'organism', params: { taxid: experiment.taxid } },
      label: experiment.scientific_name || experiment.metadata.scientific_name
    },
    ncbiPath: `https://www.ncbi.nlm.nih.gov/sra/${accession}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${accession}`
  }
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
