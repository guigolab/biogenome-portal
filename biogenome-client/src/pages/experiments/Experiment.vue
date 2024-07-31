<template>
  <DetailsHeader v-if="details" :details="details" />
  <VaSkeletonGroup v-else>
    <VaSkeleton tag="h1" variant="text" class="va-h1" />
    <VaSkeleton variant="text" :lines="1" />
  </VaSkeletonGroup>
  <VaTabs v-model="tab">
    <template #tabs>
      <VaTab :label="t('tabs.metadata')" name="metadata"></VaTab>
      <VaTab v-if="reads.length" :label="t('tabs.reads')" name="reads"></VaTab>
    </template>
  </VaTabs>
  <VaDivider style="margin-top: 0;" />
  <div class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <MetadataTreeCard v-if="tab === 'metadata' && experiment" :metadata="Object.entries(experiment.metadata)" />
      <VaDataTable v-else :items="reads" :columns="['run_accession', 'metadata.submitted_bytes', 'actions']">
        <template #cell(metadata.submitted_bytes)="{ rowData }">
          {{ convertBytesToMBOrGB(rowData.metadata.submitted_bytes) }}
        </template>
        <template #cell(actions)="{ row, isExpanded }">
          <VaButton :icon="isExpanded ? 'va-arrow-up' : 'va-arrow-down'" preset="secondary" class="w-full"
            @click="row.toggleRowDetails()">{{ t('buttons.view') }}
          </VaButton>
        </template>
        <template #expandableRow="{ rowData }">
          <div class="">
            <MetadataTreeCard :metadata="Object.entries(rowData.metadata)" />
          </div>
        </template>
      </VaDataTable>
    </div>
  </div>
</template>
<script setup lang="ts">
import ExperimentService from '../../services/clients/ExperimentService'
import { ref, watchEffect } from 'vue'
import { Details } from '../../data/types'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import { useI18n } from 'vue-i18n'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'

const { t } = useI18n()

const { init } = useToast()
const props = defineProps<{
  accession: string
}>()
const experiment = ref<Record<string, any>>()
const tab = ref('metadata')
const details = ref<
  Details | any
>()

const reads = ref<Record<string, any>[]>([])

watchEffect(async () => {
  await getData(props.accession)
})

async function getData(accession: string) {
  try {
    const { data } = await ExperimentService.getExperiment(accession)
    experiment.value = { ...data }
    details.value = { ...parseDetails(data) }
    await getReads(accession)
  } catch (error) {
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

async function getReads(accession: string) {
  const { data } = await ExperimentService.getReadsByExperiment(accession)
  reads.value = [...data]
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
    button2: {
      route: { name: 'biosamples', params: { accession: experiment.sample_accession } },
      label: experiment.sample_accession
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
  result = result.slice(0, -2);

  return result;
}

</script>
