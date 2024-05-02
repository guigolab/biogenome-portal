<template>
  <div :key="props.accession">
    <DetailsHeader :details="details" />
    <VaTabs v-model="tab">
      <template #tabs>
        <VaTab label="Metadata" name="metadata"></VaTab>
        <VaTab v-if="reads.length" label="Related Reads" name="reads"></VaTab>
      </template>
    </VaTabs>
    <VaDivider></VaDivider>
    <div class="row" v-if="tab === 'metadata'">
      <div v-if="metadata && Object.keys(metadata).length" class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
    </div>
    <div class="row" v-else>
      <div class="flex lg12 md12 sm12 xs12">
        <VaDataTable :items="reads" :columns="['run_accession', 'metadata.submitted_bytes', 'actions']">
          <template #cell(metadata.submitted_bytes)="{ rowData }">
            {{ convertBytesToMBOrGB(rowData.metadata.submitted_bytes) }}
          </template>
          <template #cell(actions)="{ row, isExpanded }">
            <VaButton :icon="isExpanded ? 'va-arrow-up' : 'va-arrow-down'" preset="secondary" class="w-full"
              @click="row.toggleRowDetails()">
            </VaButton>
          </template>

          <template #expandableRow="{ rowData }">
            <div class="">
              <MetadataTreeCard :metadata="rowData.metadata" />
            </div>
          </template>
        </VaDataTable>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import ExperimentService from '../../services/clients/ExperimentService'
import { onMounted, ref } from 'vue'
import { Details } from '../../data/types'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import KeyValueCard from '../../components/ui/KeyValueCard.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
const props = defineProps<{
  accession: string
}>()

const tab = ref('metadata')
const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
const details = ref<
  Details | any
>()
const metadata = ref<Record<string, any> | null>(null)

onMounted(async () => {
  await getExperiment(props.accession)
  await getReads(props.accession)
})
const reads = ref<Record<string, any>[]>([])

async function getExperiment(accession: string) {
  try {
    isLoading.value = true
    const { data } = await ExperimentService.getExperiment(accession)
    details.value = { ...parseDetails(data) }
    if (data.metadata) metadata.value = { ...data.metadata }
  } catch (e) {
    errorMessage.value = e
  } finally {
    isLoading.value = false
  }
}


async function getReads(accession: string) {
  try {
    isLoading.value = true
    const { data } = await ExperimentService.getReadsByExperiment(accession)
    reads.value = [...data]
  } catch (e) {
    errorMessage.value = e
  } finally {
    isLoading.value = false
  }
}
function parseDetails(experiment: Record<string, any>) {
  const accession = experiment.experiment_accession
  const details: Details = {
    title: accession,
    description: experiment.metadata.experiment_title,
    button1: {
      route: { name: 'organism', params: { taxid: experiment.taxid } },
      label: experiment.scientific_name || experiment.metadata.scientific_name
    },
    ncbiPath: `https://www.ncbi.nlm.nih.gov/sra/${accession}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${accession}`
  }
  return details
}

function convertBytesToMBOrGB(submittedBytes: string): string {
  const byteStrings: string[] = submittedBytes.split(';');

  let result: string = "";

  byteStrings.forEach(byteString => {
    const bytes: number = parseInt(byteString, 10);
    const mb: number = bytes / (1024 * 1024);
    const gb: number = mb / 1024;

    if (gb >= 1) {
      result += gb.toFixed(2) + ' GB, ';
    } else {
      result += mb.toFixed(2) + ' MB, ';
    }
  });

  // Remove trailing comma and space
  result = result.slice(0, -2);

  return result;
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
