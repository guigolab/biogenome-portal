<template>
   <b-modal :size="size" id="data-modal" scrollable :title="organism +' '+model">
        <experiments-component v-if="model === 'experiments'" :experiments="data"/>
        <assemblies-component v-if="model === 'assemblies'" :assemblies="data"/>
        <sample-component v-if="model === 'insdc_samples' || model === 'local_samples'" :samples="data" :name="organism"/>
  </b-modal>
</template>
<script>
import AssembliesComponent from '../data/AssembliesComponent.vue'
import ExperimentsComponent from '../data/ExperimentsComponent.vue'
import SampleComponent from '../sample/SampleComponent.vue'

export default {
    props: ['organism', 'model', 'data'],
    components: {AssembliesComponent,ExperimentsComponent, SampleComponent},
    computed: {
        size(){
            if (this.model === 'experiments'){
                return 'xl'
            }
            return 'lg'
        }
    }
    }

</script>

<style>

</style>
