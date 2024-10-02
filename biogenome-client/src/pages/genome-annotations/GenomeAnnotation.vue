<template>
  <div v-if="details" class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <h1 style="margin: 0;" class="va-h1">{{ details.title }}</h1>
      <p class="va-text-secondary" v-if="details.description">{{ details.description }}</p>
    </div>
    <div class="flex lg12 md12 sm12 xs12">
      <div class="row">
        <div class="flex">
          <va-button :round="false" preset="primary" icon="pets" :to="details.button1.route">{{
            details.button1.label
            }}</va-button>
        </div>
        <div class="flex">
          <va-button :round="false" :to="details.button2.route" preset="primary" icon="fa-dna">{{
            details.button2.label
            }}</va-button>
        </div>
        <div class="flex">
          <va-button :href="annotation?.gff_gz_location" :round="false" preset="primary"
            icon="cloud_download">
            Download
          </va-button>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <VaSkeletonGroup>
      <VaSkeleton tag="h1" variant="text" class="va-h1" />
      <VaSkeleton variant="text" :lines="1" />
    </VaSkeletonGroup>
  </div>
  <div v-if="validTabs.length && annotation">
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
  if (annotation.value?.metadata && Object.keys(annotation.value.metadata).length) {
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
    },
    button2: {
      route: { name: 'assembly', params: { accession: annotation.assembly_accession } },
      label: annotation.assembly_accession
    }
  }
  return details
}
</script>
