<template>
<div ref="annotationsTable">
  <table-component stacked :sticky-header="stickyHeader" :items="annotations" :fields="fields">
    <template #cell(pageURL)="data">
        <b-link class="no-underline" target="_blank" :href="data.value">Open</b-link>
    </template>
    <template #cell(gffGzLocation)="data">
        <b-link class="no-underline" target="_blank" :href="data.value">Download</b-link>
    </template>
        <template #cell(tabIndexLocation)="data">
        <b-link class="no-underline" target="_blank" :href="data.value">Download</b-link>
    </template>
    <template #cell(assemblyAccession)="data">
        <b-link class="no-underline" target="_blank" :href="'https://www.ebi.ac.uk/ena/browser/view/' + data.value">{{data.value}}</b-link>
    </template>
    <template #cell(annotationSource)="data">
        <b-link class="no-underline" target="_blank" :href="data.value">{{data.value}}</b-link>
    </template>
    <template #cell(evidenceSource)="data">
        <div v-for="value in data.value.split('.')" :key="value">
            {{value}}
        </div>
    </template>
</table-component>
</div>
</template>

<script>
import {BLink} from 'bootstrap-vue'
import TableComponent from '../base/TableComponent.vue'

export default{
  components: { TableComponent,BLink },
  props: ['annotations'],
  data(){
      return {
          fields:[
              {key:'name', label: 'Name'},
              {key:'gffGzLocation', label: 'GFF3 (.gz)'},
              {key:'tabIndexLocation', label: 'GFF3 (gz.tbi)'},
              {key:'pageURL', label: 'Genome Browser'},
              {key:'annotationSource', label: 'Annotation Pipeline'},
              {key:'evidenceSource', label: 'Evidence Source'},
              {key:'targetGenome', label: 'Assembly Name'},
              {key:'assemblyAccession', label: 'Assembly Accession'}
          ]
      }
  }
}
</script>
<style>

</style>