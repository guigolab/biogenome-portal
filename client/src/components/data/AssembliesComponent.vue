<template>
<div>
  <table-component :sticky-header="stickyHeader" :items="assemblies" :fields="assemblyFields">
    <template #cell(accession)="data">
        <a class="no-underline" target="_blank" :href="'https://www.ebi.ac.uk/ena/browser/view/' + data.value">{{data.value}}</a>
    </template>
</table-component>
</div>
</template>

<script>
import TableComponent from '../base/TableComponent.vue'

export default{
  components: { TableComponent },
  props: ['assemblies'],
  data(){
    return {
      assemblyFields: [
        {key:'accession', label: 'Accession'},
        {key:'sample_accession', label: 'Sample Accession'},
        {key:'version',label:'Version'},
        {key: 'description',label:'Description'},
        {key:'assembly_name', label: 'Name'}
      ],
    }
  }
}
</script>
<style>

</style>