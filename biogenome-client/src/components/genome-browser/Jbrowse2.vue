<template>
  <div ref="wrapper" style="height: inherit; width: inherit"></div>
</template>

<script setup lang="ts">
import { JBrowseLinearGenomeView, createViewState } from '@jbrowse/react-linear-genome-view'
import { createRoot } from 'react-dom/client'
import React from 'react'
import { onMounted, ref } from 'vue'
import RefGetPlugin from 'jbrowse-plugin-refget-api'
import { Assembly, AssemblyAdapter, TrackData } from '../../data/types'
// import '@fontsource/roboto'
const wrapper = ref(null)

const props = defineProps<{
  defaultSession?: Record<string, any>
  configuration?: Record<string, any>
  assembly: Assembly | undefined
  annotations: TrackData[]
}>()
const assemblyAdapter = ref<Record<string, any>>()
const tracks = ref<Record<string, any>[]>([])

onMounted(() => {
  if (props.assembly) {
    assemblyAdapter.value = parseAssembly(props.assembly)
    if (props.annotations.length) tracks.value = parseAnnotations()
    renderBrowser()
  }
})

function renderBrowser() {
  const options = tracks.value.length ? { assembly: { ...assemblyAdapter.value }, plugins: [RefGetPlugin], tracks: [...tracks.value] } :
    { assembly: { ...assemblyAdapter.value }, plugins: [RefGetPlugin] }
  createRoot(wrapper.value).render(
    React.createElement(JBrowseLinearGenomeView, {
      viewState: new createViewState({ ...options }),
    }),
  )
}

function parseAssembly(assembly: Assembly) {
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
  assembly.chromosomes.forEach((chr: Record<string, any>) => {
    const key = 'insdc:' + chr.accession_version
    assemblyAdapter.sequence.adapter.sequenceData[key] = {
      name: chr.metadata.name,
      size: Number(chr.metadata.length),
    }
  })
  return assemblyAdapter
}

function parseAnnotations() {
  const assembly_name = props.assembly ? props.assembly.assembly_name || props.assembly.accession : ''
  return props.annotations.map((d: TrackData) => {
    const track = {
      type: "FeatureTrack",
      trackId: d.name,
      name: d.name,
      assemblyNames: [assembly_name],
      category: ["Genes"],
      adapter: {
        type: "Gff3TabixAdapter",
        gff_gz_location: {
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
    };
    return track;
  });
}
function setDefaultSession() {
  const defaultSession = {
    name: 'My session',
    view: {
      id: 'linearGenomeView',
      type: 'LinearGenomeView',
      tracks: [
        {
          // the first track displayed
        },
        {
          // the second track displayed
        },
        {
          // ...
        },
      ],
    },
  }
}
</script>
