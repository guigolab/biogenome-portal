<template>
    <b-row>
        <b-col>
            <b-tabs
                content-class="mt-3" fill
            >
                <b-tab active class="tab-element">
                    <template #title>
                        <strong>Details</strong>
                    </template>
                    <table-component :sticky-header="stickyHeader" :items="[metadata()]" :stacked="true">
                        <template #cell(accession)="data">
                            <b-link v-if="data.value" :href="'https://www.ebi.ac.uk/ena/browser/view/'+ data.value" target="_blank">{{data.value}}</b-link>
                        </template>
                        <template #cell(bioprojects)="data">
                            <b-link target="_blank" v-for="bioproject in data.item.bioprojects" :key="bioproject" :href="'https://www.ebi.ac.uk/ena/browser/view/'+bioproject">
                                {{bioproject}}
                            </b-link>
                        </template>
                    </table-component>
                </b-tab>
                <b-tab v-if="sample.specimens && sample.specimens.length > 0"  class="tab-element" lazy>
                    <template #title>
                        <strong>Specimens  </strong><b-badge variant="primary"  pill>{{sample.specimens.length}}</b-badge>
                    </template>
                    <sample-component :samples="sample.specimens"/>
                </b-tab>
                <b-tab  class="tab-element" v-if="sample.assemblies && sample.assemblies.length" lazy>
                    <template #title>
                        <strong>Assemblies  </strong><b-badge variant="primary"  pill>{{sample.assemblies.length}}</b-badge>
                    </template>
                    <assemblies-component :assemblies="sample.assemblies"/>
                </b-tab>
                <b-tab  class="tab-element"  v-if="sample.experiments && sample.experiments.length" lazy>
                    <template #title>
                        <strong>Experiments  </strong><b-badge variant="primary"  pill>{{sample.experiments.length}}</b-badge>
                    </template>
                    <experiments-component :experiments="sample.experiments"/>
                </b-tab>
            </b-tabs>
        </b-col>
    </b-row>
</template>

<script>
import {BTabs,BTab,BBadge,BLink} from 'bootstrap-vue'
import AssembliesComponent from '../data/AssembliesComponent.vue'
import ExperimentsComponent from '../data/ExperimentsComponent.vue'
import SampleComponent from './SampleComponent.vue'
import TableComponent from '../base/TableComponent.vue'
// import Feature from 'ol/Feature'
export default {
    components: {BTabs,BTab,BBadge,BLink,TableComponent, AssembliesComponent, ExperimentsComponent, SampleComponent},
    props:['sample'],
    data(){
        return {
            excludedFields: ['_id', 'experiments', 'assemblies', 'specimens'],
        }
    },
    methods: {
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