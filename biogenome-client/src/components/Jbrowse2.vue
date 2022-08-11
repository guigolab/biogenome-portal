<template>
<va-card class="custom-card">
  <va-card-title>
    Genome Browser
  </va-card-title>
  <va-card-content>
    <div ref="wrapper">
    </div>
  </va-card-content>
</va-card>

</template>

<script setup>
import {
  JBrowseLinearGenomeView,
  createViewState
} from '@jbrowse/react-linear-genome-view'
import { createRoot } from 'react-dom/client'
import React from 'react'
import {onMounted, ref} from 'vue'
// import '@fontsource/roboto'
const wrapper = ref(null)

const props = defineProps({
  defaultSession: Object,
  configuration:Object,
  assembly:Object,
  tracks:Object,
})

onMounted(()=>{
  wrapper.value.focus()
  renderBrowser()
})

function renderBrowser(){
    const assembly = props.assembly
    const tracks = Object.assign([],props.tracks)
  createRoot(wrapper.value)
    .render(
      React.createElement(JBrowseLinearGenomeView, {viewState: new createViewState({assembly:assembly,tracks:tracks})})
      )
}
</script>

