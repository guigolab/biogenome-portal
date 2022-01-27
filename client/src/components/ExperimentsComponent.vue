<template>
<div>
    <b-button style="margin-bottom:15px"  variant="outline-primary" block @click="showFields = !showFields">
        Column Selection 
    </b-button>
    <b-collapse style="margin-bottom:10px" v-model="showFields">
            <b-form-checkbox-group
                id="experiment-fields"
                v-model="experimentFields"
                name="experiment-fields"
                size="sm"
            >
            <b-row cols="1" cols-sm="2" cols-md="4" cols-lg="6">
                <b-col v-for="key in experimentKeys()" :key="key">
                    <b-form-checkbox class="exp-field" :value="key">{{key}}</b-form-checkbox>
                </b-col>
            </b-row>
            </b-form-checkbox-group>
    </b-collapse>
    <table-component
        :sticky-header="stickyHeader"
        :items="experiments"
        :fields="experimentFields"
    >
        <template #cell(experiment_accession)="data">
          <a class="no-underline" target="_blank" :href="url+data.value">{{data.value}}</a>
        </template>
        <template #cell(study_accession)="data">
            <a class="no-underline" target="_blank" :href="url+data.value">{{data.value}}</a>
        </template>
      <template #cell(sample_accession)="data">
          <a class="no-underline" target="_blank" :href="url+data.value">{{data.value}}</a>
      </template>
      <template #cell(sample_alias)="data">
          <a class="no-underline" target="_blank" :href="url+data.value">{{data.value}}</a>
      </template>
      <template #cell(run_accession)="data">
          <a class="no-underline" target="_blank" :href="url+data.value">{{data.value}}</a>
      </template>
      <template #cell(tax_id)="data">
          <a class="no-underline" target="_blank" :href="url+'Taxon:'+data.value">{{data.value}}</a>
      </template>
      <template #cell(secondary_sample_accession)="data">
          <a class="no-underline" target="_blank" :href="url+data.value">{{data.value}}</a>
      </template>
         <template #cell(secondary_study_accession)="data">
          <a class="no-underline" target="_blank" :href="url+data.value">{{data.value}}</a>
      </template>
      <template #cell(fastq_ftp)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="'ftp://'+elem">{{elem}}</a>
            </li>
        </ul>
      </template>
      <template #cell(fastq_aspera)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="elem">{{elem}}</a>
            </li>
        </ul>
      </template>
       <template #cell(fastq_galaxy)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="elem">{{elem}}</a>
            </li>
        </ul>
      </template>
      <template #cell(submitted_ftp)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="'ftp://'+elem">{{elem}}</a>
            </li>
        </ul>
      </template>
      <template #cell(submitted_aspera)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="elem">{{elem}}</a>
            </li>
        </ul>
      </template>
       <template #cell(submitted_galaxy)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="elem">{{elem}}</a>
            </li>
        </ul>
      </template>
       <template #cell(sra_ftp)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="'ftp://'+elem">{{elem}}</a>
            </li>
        </ul>
      </template>
      <template #cell(sra_galaxy)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="'ftp://'+elem">{{elem}}</a>
            </li>
        </ul>
      </template>
      <template #cell(cram_index_ftp)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="'ftp://'+elem">{{elem}}</a>
            </li>
        </ul>
      </template>
      <template #cell(cram_index_aspera)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="elem">{{elem}}</a>
            </li>
        </ul>
      </template>
       <template #cell(cram_index_galaxy)="data">
        <ul>
            <li v-for="elem in data.value.split(';')" :key="elem">
                <a class="no-underline" target="_blank" :href="elem">{{elem}}</a>
            </li>
        </ul>
      </template>
</table-component>
</div>

</template>

<script>
import {BCollapse,BFormCheckboxGroup,BButton, BFormCheckbox} from 'bootstrap-vue'
import TableComponent from './TableComponent.vue'
import {experimentsParams} from '../static-config'


export default {
    props: ['experiments'],
    data() {
        return {
            showFields:false,
            experimentFields: ['study_accession','run_accession','scientificName','experiment_title'],
            experimentsParams: experimentsParams,
            stickyHeader: '50vh',
            url: 'https://www.ebi.ac.uk/ena/browser/view/'
        }
    },
    methods: {
        experimentKeys(){
            const keys = Object.keys(this.experiments[0]).filter(key => key !== '_id')
            return keys
        }
    },
    components: {
        TableComponent,BCollapse,BFormCheckboxGroup,BButton, BFormCheckbox
    },

    }
</script>
<style scoped>
li {
    list-style: none;
}
</style>
