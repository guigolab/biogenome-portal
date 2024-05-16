<template>
  <DetailsHeader v-if="details" :details="details" />
  <VaSkeletonGroup v-else>
    <VaSkeleton tag="h1" variant="text" class="va-h1" />
    <VaSkeleton variant="text" :lines="1" />
  </VaSkeletonGroup>
  <VaTabs v-model="tab">
    <template #tabs>
      <VaTab :label="t('tabs.metadata')" name="metadata"></VaTab>
      <VaTab :label="t('tabs.chromosomes')" v-if="chromosomes.length" name="chromosomes"></VaTab>
      <VaTab :label="t('tabs.annotations')" v-if="annotations.length" name="annotations"></VaTab>
      <VaTab :label="t('tabs.jbrowse')" v-if="annotations.length || chromosomes.length" name="jbrowse">
      </VaTab>
    </template>
  </VaTabs>
  <VaDivider style="margin-top: 0;" />
  <div class="row" v-if="tab === 'chromosomes'">
    <div class="flex lg12 md12 sm12 xs12">
      <VaDataTable :items="chromosomes" :columns="['accession_version', 'metadata.name', 'metadata.length', 'actions']">
        <template #cell(actions)="{ row, isExpanded }">
          <VaButton :icon="isExpanded ? 'va-arrow-up' : 'va-arrow-down'" preset="secondary" class="w-full"
            @click="row.toggleRowDetails()">{{ t('buttons.view') }}
          </VaButton>
        </template>
        <template #expandableRow="{ rowData }">
          <div class="">
            <MetadataTreeCard
              :metadata="Object.entries(rowData.metadata).length ? Object.entries(rowData.metadata) : []" />
          </div>
        </template>
      </VaDataTable>
    </div>
  </div>
  <div class="row" v-else-if="tab === 'annotations'">
    <div class="flex lg12 md12 sm12 xs12">
      <VaDataTable :items="annotations" :columns="['name', 'gff_gz_location', 'tab_index_location', 'actions']">
        <template #cell(actions)="{ rowData }">
          <va-chip :to="{ name: 'annotation', params: { name: rowData.name } }" size="small">{{ t('buttons.view')
            }}</va-chip>
        </template>
        <template #cell(gff_gz_location)="{ rowData }">
          <va-chip :href="rowData.gff_gz_location">{{ t('buttons.download') }}</va-chip>
        </template>
        <template #cell(tab_index_location)="{ rowData }">
          <va-chip :href="rowData.tab_index_location" size="small">{{ t('buttons.download') }}</va-chip>
        </template>
      </VaDataTable>
    </div>
  </div>
  <div v-else-if="tab === 'jbrowse'" class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <Jbrowse2 :assembly="assembly" :annotations="annotations" />
    </div>
  </div>
  <div v-else class="row">
    <div v-if="assembly" class="flex lg12 md12 sm12 xs12">
      <MetadataTreeCard :metadata="Object.entries(assembly.metadata)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AssemblyService from '../../services/clients/AssemblyService'
import { ref, watchEffect } from 'vue'
import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
import { Assembly, Details, TrackData } from '../../data/types'
import { useI18n } from 'vue-i18n'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'

const { t } = useI18n()
const { init } = useToast()

const props = defineProps<{
  accession: string
}>()

const details = ref<
  Details | any
>()

const tab = ref('metadata')
const assembly = ref<Assembly>()
const annotations = ref<TrackData[]>([])
const chromosomes = ref<Record<string, any>[]>([])

watchEffect(async () => {
  await getData(props.accession)
})

async function getData(accession: string) {
  try {
    const { data } = await AssemblyService.getAssembly(accession)
    details.value = { ...parseDetails(data) }
    assembly.value = { ...data }
    await getRelatedAnnotations(accession)
    await getRelatedChromosomes(accession)
  } catch (error) {
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })

  }
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