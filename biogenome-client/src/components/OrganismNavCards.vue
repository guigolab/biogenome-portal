<template>
    <div class="row custom-card align--center">
        <div class="scroller">
            <div v-if="organism.biosamples && organism.biosamples.length" class="flex menu-item">
                <va-card @click="$emit('onSelected','biosamples')" class="custom-card box" :stripe="selectedModel === 'biosamples'" :stripe-color="dataIcons.biosamples.color">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                <p>biosamples</p>
                            </div>
                            <div class="flex">
                                <va-icon 
                                    :name="dataIcons.biosamples.icon"
                                    :color="dataIcons.biosamples.color"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div class="row justify--space-between">
                            <div class="flex">
                                <span @click="$emit('onSelected','biosamples')"><strong>{{organism.biosamples.length}}</strong></span>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.local_samples && organism.local_samples.length" class="flex menu-item">
                <va-card @click="$emit('onSelected','local_samples')" class="custom-card box" :stripe="selectedModel === 'local_samples'" :stripe-color="dataIcons.local_samples.color">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                <p>local_samples</p>
                            </div>
                            <div class="flex">
                                <va-icon 
                                    :name="dataIcons.local_samples.icon"
                                    :color="dataIcons.local_samples.color"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div class="row justify--space-between">
                            <div class="flex">
                                <span @click="$emit('onSelected','local_samples')"><strong>{{organism.local_samples.length}}</strong></span>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.assemblies && organism.assemblies.length" class="flex menu-item">
                <va-card @click="$emit('onSelected','assemblies')" class="custom-card box" :stripe="selectedModel === 'assemblies'" :stripe-color="dataIcons.assemblies.color">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                <p>assemblies</p>
                            </div>
                            <div class="flex">
                                <va-icon 
                                    :name="dataIcons.assemblies.icon"
                                    :color="dataIcons.assemblies.color"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div class="row justify--space-between">
                            <div class="flex">
                                <span @click="$emit('onSelected','assemblies')"><strong>{{organism.assemblies.length}}</strong></span>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.experiments && organism.experiments.length" class="flex menu-item">
                <va-card @click="$emit('onSelected','experiments')" class="custom-card box" :stripe="selectedModel === 'experiments'" :stripe-color="dataIcons.experiments.color">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                <p>experiments</p>
                            </div>
                            <div class="flex">
                                <va-icon 
                                    :name="dataIcons.experiments.icon"
                                    :color="dataIcons.experiments.color"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div class="row justify--space-between">
                            <div class="flex" >
                                <span><strong>{{organism.experiments.length}}</strong></span>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.annotations && organism.annotations.length" class="flex menu-item">
                <va-card @click="$emit('onSelected','annotations')" class="custom-card box" :stripe="selectedModel === 'annotations'" :stripe-color="dataIcons.annotations.color">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                <p>annotations</p>
                            </div>
                            <div class="flex">
                                <va-icon 
                                    :name="dataIcons.annotations.icon"
                                    :color="dataIcons.annotations.color"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div class="row justify--space-between">
                            <div class="flex">
                                <span @click="$emit('onSelected','annotations')"><strong>{{organism.annotations.length}}</strong></span>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.coordinates && organism.coordinates.length" class="flex menu-item">
                <va-card @click="$emit('onSelected','coordinates')" class="custom-card box" :stripe="selectedModel === 'coordinates'">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                <p>Map</p>
                            </div>
                            <div class="flex">
                                <va-icon 
                                    name="travel_explore"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div class="row justify--space-between">
                            <div class="flex">
                                <span><strong>{{organism.coordinates.length}}</strong></span>
                            </div>
                        </div>
                    </va-card-content>
                </va-card> 
            </div>
            <div v-if="organism.genome_browser_data && organism.genome_browser_data.length" class="flex menu-item">
                <va-card @click="$emit('onSelected','jbrowse')" :stripe="selectedModel === 'jbrowse'" stripe-color="#752061" class="custom-card box">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                <p>Genome Browser</p>
                            </div>
                            <div class="flex">
                                <va-icon 
                                    name="view_timeline"
                                    color="#752061"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div class="row justify--space-between">
                            <div class="flex">
                                <span><strong>{{organism.genome_browser_data.length}}</strong></span>
                            </div>
                        </div>
                    </va-card-content>
                </va-card> 
            </div>
        </div>
    </div> 
</template>
<script setup>
import {dataIcons} from '../../config.json'

const props = defineProps({
    organism:Object,
    selectedModel:String
})
const emits = defineEmits(['onSelected'])

</script>



<style scoped>
.scroller {
  overflow: auto;
  white-space: nowrap;
  display: block;
}

.menu-item {
  display: inline-block;
  text-align: center;
  text-decoration: none;
}
</style>