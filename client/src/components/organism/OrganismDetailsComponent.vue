<template>
    <b-row>
        <b-col>
            <b-tabs
                pills
                content-class="mt-3" fill
                v-model="tabIndex"
            >
                <b-tab :title-link-class="linkClass(0)" active class="tab-element" lazy>
                    <template #title>
                        <strong>Samples  </strong><b-badge :variant="linkVariant(0)" pill>{{samples.length}}</b-badge>
                    </template>
                    <sample-component :name="organism.organism" :samples="samples"/>
                </b-tab>
                <b-tab :title-link-class="linkClass(1)" class="tab-element" v-if="organism.assemblies && organism.assemblies.length" lazy>
                    <template #title>
                        <strong>Assemblies  </strong><b-badge :variant="linkVariant(1)" pill>{{organism.assemblies.length}}</b-badge>
                    </template>
                    <assemblies-component :assemblies="organism.assemblies"/>
                </b-tab>
                <b-tab :title-link-class="linkClass(expIndex)" class="tab-element"  v-if="organism.experiments && organism.experiments.length" lazy>
                    <template #title>
                        <strong>Experiments  </strong><b-badge :variant="linkVariant(expIndex)" pill>{{organism.experiments.length}}</b-badge>
                    </template>
                    <experiments-component :experiments="organism.experiments"/>
                </b-tab>
            </b-tabs>
        </b-col>
    </b-row>
</template>

<script>
import {BTabs,BTab,BBadge} from 'bootstrap-vue'
import ExperimentsComponent from '../data/ExperimentsComponent.vue'
import AssembliesComponent from '../data/AssembliesComponent.vue'
import SampleComponent from '../sample/SampleComponent.vue'
export default {
    components: {BTabs,ExperimentsComponent,BTab, BBadge, AssembliesComponent, SampleComponent},
    props:['organism'],
    computed:{
        expIndex(){
            if(this.haveItems(this.organism.assemblies)){
                return 2
            }
            return 1
        },
        samples(){
            return [...this.organism.insdc_samples, ...this.organism.local_samples]
        }
    },
    data(){
        return {
            tabIndex:0,
            mapKey: 0
        }
    },
    methods: {
        haveItems(arr){
            return arr && arr.length > 0
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
<style scoped>
.tab-element{
    padding-top: 10px;
    padding-bottom: 10px;
    min-height: 66vh;
}
#species-image{
margin-right: 10px;
}

</style>