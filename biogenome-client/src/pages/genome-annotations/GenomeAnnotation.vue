<template>
  <DetailsHeader v-if="details" :details="details" />
  <VaSkeletonGroup v-else>
    <VaSkeleton tag="h1" variant="text" class="va-h1" />
    <VaSkeleton variant="text" :lines="1" />
  </VaSkeletonGroup>
  <VaTabs v-model="tab">
    <template #tabs>
      <VaTab :label="t('tabs.metadata')" name="metadata"></VaTab>
      <VaTab :label="t('tabs.jbrowse')" name="jbrowse"></VaTab>
    </template>
  </VaTabs>
  <div v-if="tab === 'jbrowse'" class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <Jbrowse2 :assembly="assembly" :annotations="annotations" />
    </div>
  </div>
  <div v-else class="row">
    <div v-if="annotations.length" class="flex lg12 md12 sm12 xs12">
      <MetadataTreeCard :metadata="Object.entries(annotations[0].metadata)" />
    </div>
  </div>
</template>
<script setup lang="ts">
import AssemblyService from '../../services/clients/AssemblyService'
import { ref, watchEffect } from 'vue'
import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
import { Assembly, Details, TrackData } from '../../data/types'
import AnnotationService from '../../services/clients/AnnotationService'
import { useI18n } from 'vue-i18n'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'

const { t } = useI18n()

const tab = ref('metadata')
const props = defineProps<{
  name: string
}>()

const { init } = useToast()

const details = ref<
  Details | any
>()
const assembly = ref<Assembly>()
const annotations = ref<TrackData[]>([])


watchEffect(async () => {
  await getData(props.name)
})

async function getData(name: string) {
  try {
    const { data } = await AnnotationService.getAnnotation(name)
    details.value = { ...parseDetails(data) }
    annotations.value.push(data)
    await getRelatedAssembly(data.assembly_accession)
  } catch (e) {
    const axiosError = e as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

async function getRelatedAssembly(accession: string) {
  const { data } = await AssemblyService.getAssembly(accession)
  assembly.value = { ...data }
  return data
}
function parseDetails(annotation: Record<string, any>) {
  const name = annotation.name
  const details: Details = {
    title: name,
    button1: {
      route: { name: 'organism', params: { taxid: annotation.taxid } },
      label: annotation.scientific_name
    }
  }
  return details
}
</script>

