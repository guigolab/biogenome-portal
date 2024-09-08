<template>
  <DetailsHeader :details="details" />
  <div v-if="validTabs.length">
    <Tabs :tabs="validTabs" :tab="tab" @updateView="(v: string) => tab = v" />
    <div class="row">
      <div class="flex lg12 md12 sm12 xs12">
        <Jbrowse2 v-if="tab === 'jbrowse'" :assembly="assembly" :annotations="[annotation]" />
        <MetadataTreeCard v-else :metadata="annotation ? Object.entries(annotation.metadata) : []" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import AssemblyService from '../../services/clients/AssemblyService'
import { ref, watchEffect } from 'vue'
import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
import { Assembly, Details, TrackData } from '../../data/types'
import AnnotationService from '../../services/clients/AnnotationService'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import Tabs from '../../components/common/Tabs.vue'

import MetadataTreeCard from '../../components/cards/MetadataTreeCard.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'

const tab = ref('')
const props = defineProps<{
  name: string
}>()

const { init } = useToast()

const details = ref<
  Details | any
>()
const assembly = ref<Assembly>()
const annotation = ref<TrackData>()
const validTabs = ref<{ label: string, name: string }[]>([])


watchEffect(async () => {
  await getData(props.name)
})

async function getData(name: string) {
  try {
    const { data } = await AnnotationService.getAnnotation(name)
    details.value = { ...parseDetails(data) }
    annotation.value = data
    await getRelatedAssembly(data.assembly_accession)
    setValidTabs()
  } catch (e) {
    const axiosError = e as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

function setValidTabs() {
  const t = []
  if (annotation.value?.metadata) {
    t.push({ name: 'metadata', label: 'tabs.metadata' })
  }
  t.push({ name: 'jbrowse', label: 'tabs.jbrowse' })
  validTabs.value = [...t]
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
