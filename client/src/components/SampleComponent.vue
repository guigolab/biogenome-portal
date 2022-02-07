<template>
    <div>
        <table-component :sticky-header="stickyHeader" :fields="sampleFields" :items="samples">
            <template #cell(accession)="data">
                <b-link :to="{name: 'sample-details', params: {accession: data.value}}">{{data.value}}</b-link>
            </template>
            <template #cell(organism_part)="data">
                {{data.value && data.value.text? data.value.text : ''}}
            </template>
            <template #cell(sex)="data">
                {{data.value && data.value.text? data.value.text : ''}}
            </template>
            <template #cell(GAL)="data">
                {{data.value && data.value.text? data.value.text : ''}}
            </template>
        </table-component>
    </div>
</template>
<script>
import {BLink} from 'bootstrap-vue'
import TableComponent from './base/TableComponent.vue'
export default {
  components: { TableComponent,BLink },
    props:['samples'],
    data(){
        return {
            sampleFields: [
                {key: 'accession', label: 'Accession'},
                {key: 'organism_part', label: 'Organism Part'},
                {key: 'sex', label: 'Sex'},
                {key: 'GAL', label: 'GAL'},
            ],
            stickyHeader: '50vh',
        } 
    }
}
</script>