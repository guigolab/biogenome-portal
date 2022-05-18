<template>
<div ref="annotationsTable">
  <table-component stacked :sticky-header="stickyHeader" :items="annotations">
    <template #cell(pageURL)="data">
        <b-link class="no-underline" target="_blank" :href="data.value">Genome browser</b-link>
    </template>
    <template #cell(gffGzLocation)="data">
        <b-link class="no-underline" target="_blank" :href="data.value">GFF3</b-link>
    </template>
        <template #cell(tabIndexLocation)="data">
        <b-link class="no-underline" target="_blank" :href="data.value">GFF3 (Tabix)</b-link>
    </template>
    <template #cell(targetGenome)="data">
        <b-link class="no-underline" target="_blank" :href="'https://www.ebi.ac.uk/ena/browser/view/' + data.value">{{data.value}}</b-link>
    </template>
    <template #cell(annotationSource)="data">
        <b-link class="no-underline" target="_blank" :href="data.value">{{data.value}}</b-link>
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
}
</script>
<style>

</style>