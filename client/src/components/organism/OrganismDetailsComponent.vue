<template>
    <b-row>
        <b-col>
            <b-tabs
                content-class="mt-3" fill
            >
                <b-tab  active class="tab-element" lazy>
                    <template #title>
                        <strong>Samples  </strong><b-badge pill variant="primary">{{samples.length}}</b-badge>
                    </template>
                    <sample-component :name="organism.organism" :samples="samples"/>
                </b-tab>
                <b-tab  class="tab-element" v-if="organism.assemblies && organism.assemblies.length" lazy>
                    <template #title>
                        <strong>Assemblies  </strong><b-badge pill variant="primary">{{organism.assemblies.length}}</b-badge>
                    </template>
                    <assemblies-component :assemblies="organism.assemblies"/>
                </b-tab>
                <b-tab  class="tab-element"  v-if="organism.experiments && organism.experiments.length" lazy>
                    <template #title>
                        <strong>Experiments  </strong><b-badge pill variant="primary">{{organism.experiments.length}}</b-badge>
                    </template>
                    <experiments-component :experiments="organism.experiments"/>
                </b-tab>
                <b-tab  class="tab-element"  v-if="organism.annotations && organism.annotations.length" lazy>
                    <template #title>
                        <strong>Geneid Predictions </strong><b-badge pill  variant="primary">{{organism.annotations.length}}</b-badge>
                    </template>
                    <annotations-component :annotations="organism.annotations"/>
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
import AnnotationsComponent from '../data/AnnotationsComponent.vue'
export default {
    components: {BTabs,ExperimentsComponent,BTab, BBadge, AssembliesComponent, SampleComponent, AnnotationsComponent},
    props:['organism'],
    computed:{
        samples(){
            return [...this.organism.insdc_samples, ...this.organism.local_samples]
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