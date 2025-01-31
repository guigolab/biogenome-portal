<template>
  <div ref="wrapper" class="jbrowse-wrapper"></div>
</template>

<script setup lang="ts">
import { JBrowseLinearGenomeView, createViewState } from '@jbrowse/react-linear-genome-view'
import { createRoot } from 'react-dom/client'
import React from 'react'
import { computed, onMounted, ref, watch } from 'vue'
import RefGetPlugin from 'jbrowse-plugin-refget-api'
import { Assembly, AssemblyAdapter, ChromosomeInterface, TrackData } from '../data/types'

const wrapper = ref(null)
const baseURL = import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH + '/api' : '/api'

const props = defineProps<{
  defaultSession?: Record<string, any>
  assembly: Assembly | undefined
  chromosomes: ChromosomeInterface[] | undefined
  annotations: TrackData[]
}>()

const assemblyAdapter = ref<Record<string, any>>()

const tracks = computed(() => {
  const assembly_name = props.assembly ? props.assembly.assembly_name || props.assembly.accession : ''
  return props.annotations.map((d: TrackData) => {
    return {
      type: "FeatureTrack",
      trackId: d.name,
      name: d.name,
      assemblyNames: [assembly_name],
      category: ["Genes"],
      adapter: {
        type: "Gff3TabixAdapter",
        gffGzLocation: {
          uri: d.gff_gz_location,
          locationType: "UriLocation",
        },
        index: {
          location: {
            uri: d.tab_index_location,
            locationType: "UriLocation",
          },
        },
      },
    }
  })
})

onMounted(() => {
  if (props.assembly && props.chromosomes) {
    assemblyAdapter.value = parseAssembly(props.assembly, props.chromosomes)
    renderBrowser()
  }
})

// Watch for defaultSession changes and re-render the React component
watch(
  () => props.defaultSession,
  (newSession) => {
    renderBrowser(newSession)
  },
  { deep: true } // Enable deep watching for nested objects
)

function renderBrowser(defaultSession = props.defaultSession) {
  const options = tracks.value.length
    ? { assembly: { ...assemblyAdapter.value }, tracks: [...tracks.value] }
    : { assembly: { ...assemblyAdapter.value } }

  createRoot(wrapper.value).render(
    React.createElement(JBrowseLinearGenomeView, {
      viewState: new createViewState({ ...options, defaultSession, plugins: [RefGetPlugin] }),
    })
  )
}

function parseAssembly(assembly: Assembly, chromosomes: ChromosomeInterface[]) {
  const assemblyAdapter: AssemblyAdapter = {
    name: assembly.assembly_name,
    sequence: {
      name: assembly.assembly_name,
      trackId: assembly.accession,
      type: 'ReferenceSequenceTrack',
      adapter: {
        type: 'RefGetAdapter',
        sequenceData: {},
      },
    },
  }
  assemblyAdapter.refNameAliases = {
    adapter: {
      type: "RefNameAliasAdapter",
      location: {
        uri: `${baseURL}/assemblies/${assembly.accession}/chr_aliases`,
        locationType: "UriLocation"
      }
    }
  }
  chromosomes.forEach((chr: Record<string, any>) => {
    const key = 'insdc:' + chr.accession_version
    assemblyAdapter.sequence.adapter.sequenceData[key] = {
      name: chr.metadata.chr_name || chr.metadata.name || chr.accession_version,
      size: Number(chr.metadata.length),
    }
  })
  return assemblyAdapter
}
</script>

<style scoped>
.jbrowse-wrapper {
  height: inherit;
  width: inherit;
}
</style>
