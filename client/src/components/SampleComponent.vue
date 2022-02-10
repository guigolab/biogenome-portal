<template>
    <div>
        <table-component :sticky-header="stickyHeader" :fields="sampleFields" :items="samples">
            <template #cell(accession)="data">
                <b-link v-if="data.value" :to="{name: 'sample-details', params: {accession: data.value}}">{{data.value}}</b-link>
            </template>
            <template #cell(sample_unique_name)="data">
                <b-link v-if="data.value" :to="{name: 'sample-details', params: {accession: data.value}}">{{data.value}}</b-link>
            </template>
            <template #cell(organism_part)="data">
                {{data.value? data.value : ''}}
            </template>
            <template #cell(sex)="data">
                {{data.value? data.value : ''}}
            </template>
            <template #cell(GAL)="data">
                {{data.value? data.value : ''}}
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
                {key: 'sample_unique_name', label: 'Sample unique name'},
                {key: 'accession', label: 'BioSamples accession'},
                {key: 'organism_part', label: 'Organism Part'},
                {key: 'sex', label: 'Sex'},
                {key: 'GAL', label: 'GAL'},
            ],
            stickyHeader: '60vh',
        } 
    }
}
</script>