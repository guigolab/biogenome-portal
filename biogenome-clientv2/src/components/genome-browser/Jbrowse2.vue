<template>
  <div ref="wrapper" style="height: inherit; width: inherit"></div>
</template>

<script setup lang="ts">
  import { JBrowseLinearGenomeView, createViewState } from '@jbrowse/react-linear-genome-view'
  import { createRoot } from 'react-dom/client'
  import React from 'react'
  import { onMounted, ref } from 'vue'
  import RefGetPlugin from 'jbrowse-plugin-refget-api'
  // import '@fontsource/roboto'
  const wrapper = ref(null)

  const props = defineProps({
    defaultSession: Object,
    configuration: Object,
    assembly: Object,
    tracks: Array,
  })

  onMounted(() => {
    wrapper.value.focus()
    renderBrowser()
  })

  function renderBrowser() {
    console.log(props.assembly)
    const assembly = { ...props.assembly }
    const tracks = [...props.tracks]
    // const assembly = props.assembly
    const options = { assembly: assembly, plugins: [RefGetPlugin] }
    if(tracks.length) options.tracks = [...tracks]
    createRoot(wrapper.value).render(
      React.createElement(JBrowseLinearGenomeView, {
        viewState: new createViewState({...options}),
      }),
    )
  }
</script>
