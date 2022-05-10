<template>
<b-container class="router-container" fluid>
    <b-row>
        <b-col>
            <b-tabs
                pills
                content-class="mt-3" fill
                v-model="tabIndex"
            >
                <b-tab :title-link-class="linkClass(0)" active class="tab-element">
                    <template #title>
                        <strong>Details</strong>
                    </template>
                    <table-component :sticky-header="stickyHeader" :items="[metadata()]" :stacked="true">
                        <template #cell(accession)="data">
                            <b-link v-if="data.value" :href="'https://www.ebi.ac.uk/ena/browser/view/'+ data.value" target="_blank">{{data.value}}</b-link>
                        </template>
                    </table-component>
                </b-tab>
                <b-tab v-if="sample.specimens && sample.specimens.length > 0" :title-link-class="linkClass(1)" class="tab-element" lazy>
                    <template #title>
                        <strong>Specimens  </strong><b-badge :variant="linkVariant(1)" pill>{{sample.specimens.length}}</b-badge>
                    </template>
                    <sample-component :samples="sample.specimens"/>
                </b-tab>
                <b-tab :title-link-class="linkClass(assIndex)" class="tab-element" v-if="sample.assemblies && sample.assemblies.length" lazy>
                    <template #title>
                        <strong>Assemblies  </strong><b-badge :variant="linkVariant(assIndex)" pill>{{sample.assemblies.length}}</b-badge>
                    </template>
                    <assemblies-component :assemblies="sample.assemblies"/>
                </b-tab>
                <b-tab :title-link-class="linkClass(expIndex)" class="tab-element"  v-if="sample.experiments && sample.experiments.length" lazy>
                    <template #title>
                        <strong>Experiments  </strong><b-badge :variant="linkVariant(expIndex)" pill>{{sample.experiments.length}}</b-badge>
                    </template>
                    <experiments-component :experiments="sample.experiments"/>
                </b-tab>
            </b-tabs>
        </b-col>
    </b-row>
</b-container>
</template>

<script>
import {BTabs,BTab,BBadge} from 'bootstrap-vue'
import AssembliesComponent from '../data/AssembliesComponent.vue'
import ExperimentsComponent from '../data/ExperimentsComponent.vue'
import SampleComponent from './SampleComponent.vue'
import TableComponent from '../base/TableComponent.vue'
// import Feature from 'ol/Feature'
export default {
    components: {BTabs,BTab,BBadge,TableComponent, AssembliesComponent, ExperimentsComponent, SampleComponent},
    props:['sample'],
    computed:{
        expIndex(){
            if(this.haveItems(this.sample.assemblies) && this.haveItems(this.sample.specimens)){
                return 3
            }else if (this.haveItems(this.sample.assemblies) || this.haveItems(this.sample.specimens)) {
                return 2
            } else {
                return 1
            }
        },
        assIndex(){
            if(this.haveItems(this.sample.specimens)){
                return 2
            }else  {
                return 1
            }
        }
    },
    data(){
        return {
            excludedFields: ['_id', 'experiments', 'assemblies', 'specimens'],
            tabIndex:0,
        }
    },
    methods: {
        haveItems(arr){
            return arr && arr.length > 0
        },
        metadata(){
            const mappedSample = {}
            Object.keys(this.sample)
            .filter(key => !this.excludedFields.includes(key) && (this.sample[key]))
            .forEach(key => {
                if(this.sample[key] && key !== 'custom_fields'){
                    mappedSample[key] = this.sample[key]
                }else if (key === 'custom_fields'){
                    Object.keys(this.sample[key])
                    .forEach(attr => {
                        mappedSample[attr] = this.sample[key][attr]
                    })
                }
            })
            return mappedSample
        },
        linkClass(idx) {
            if (this.tabIndex === idx) {
                return ['bg-secondary', 'text-light']
            } 
            else {
                return ['bg-light', 'text-dark']
            }
        },
        linkVariant(idx){
             if (this.tabIndex === idx) {
                return 'light'
            } 
            else {
                return 'secondary'
            }
        }
}
}

</script>
<style>
.tab-element{
    padding-top: 10px;
    padding-bottom: 10px;
    min-height: 66vh;
}
/* not supported in IE, but is anybody still using it? */
.info-icons{
    color: #545b62;
    font-size: 0.85rem;
}
</style>