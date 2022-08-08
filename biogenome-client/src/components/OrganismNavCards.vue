<template>
    <div class="row custom-card align--center">
        <div class="scroller">
            <div v-if="organism.biosamples && organism.biosamples.length" class="flex menu-item">
                <va-card class="custom-card box">
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
                            <div class="flex" style="max-height:150px;overflow:scroll">
                                <ul style="list-style: decimal">
                                    <li v-for="(biosample,index) in organism.biosamples" :key="index">
                                        <span @click="$emit('onSelected',{model:'biosamples',id:biosample.accession})"><strong>{{biosample.accession}}</strong></span>
                                        <span v-if="biosample.metadata.organism_part || biosample.metadata.tissue" style="padding-left:5px" class="text--secondary">{{biosample.metadata.organism_part || biosample.metadata.tissue }}</span>
                                        <!-- <ul style="margin-left:5px" v-if="biosample.sub_samples && biosample.sub_samples.length">
                                            <li v-for="(subSample,index) in biosample.sub_samples" :key="index">
                                                <p @click="$emit('onSelected',{model:'biosamples',id:subSample.accession})">{{subSample.accession}}</p>
                                            </li>
                                        </ul> -->
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.local_samples && organism.local_samples.length" class="flex menu-item">
                <va-card class="custom-card box">
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
                            <div class="flex" style="max-height:150px;overflow:scroll">
                                <ul style="list-style: decimal">
                                    <li v-for="(sample,index) in organism.local_samples" :key="index">
                                        <span @click="$emit('onSelected',{model:'local_samples',id:sample.id})"><strong>{{sample.id}}</strong></span>
                                        <span v-if="sample.metadata.organism_part || sample.metadata.tissue" style="padding-left:5px" class="text--secondary">{{sample.metadata.organism_part || sample.metadata.tissue }}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.assemblies && organism.assemblies.length" class="flex menu-item">
                <va-card class="custom-card box">
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
                            <div class="flex" style="max-height:150px;overflow:scroll">
                                <ul style="list-style: decimal">
                                    <li v-for="(ass,index) in organism.assemblies" :key="index">
                                        <span @click="$emit('onSelected',{model:'assemblies',id:ass.accession})"><strong>{{ass.accession}}</strong></span>
                                        <span v-if="ass.assembly_name" style="padding-left:5px" class="text--secondary">{{ass.assembly_name}}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.experiments && organism.experiments.length" class="flex menu-item">
                <va-card class="custom-card box">
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
                            <div class="flex" style="max-height:150px;overflow:scroll">
                                <ul style="list-style: decimal">
                                    <li v-for="(exp,index) in organism.experiments" :key="index">
                                        <span @click="$emit('onSelected',{model:'experiments',id:exp.experiment_accession})"><strong>{{exp.experiment_accession}}</strong></span>
                                        <span v-if="exp.instrument_platform" style="padding-left:5px" class="text--secondary">{{exp.instrument_platform}}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.annotations && organism.annotations.length" class="flex menu-item">
                <va-card class="custom-card box">
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
                            <div class="flex" style="max-height:150px;overflow:scroll">
                                <ul style="list-style: decimal">
                                    <li v-for="(ann,index) in organism.annotations" :key="index">
                                        <span @click="$emit('onSelected',{model:'annotations',id:ann.name})"><strong>{{ann.name}}</strong></span>
                                        <span style="padding-left:5px" class="text--secondary">{{ann.assembly_accession}}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div v-if="organism.coordinates && organism.coordinates.length" class="flex menu-item">
                <va-card class="custom-card box">
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
                            <div class="flex" style="max-height:150px;overflow:scroll">
                                <ul style="list-style: decimal">
                                    <li v-for="(coord,index) in organism.coordinates" :key="index">
                                        <span @click="$emit('onSelected',{model:'coordinates', id:coord})"><strong>{{`lat: ${coord.split(':')[0]}, long: ${coord.split(':')[1]}`}}</strong></span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </va-card-content>
                </va-card> 
            </div>
            <div v-if="organism.genome_browser_data && organism.genome_browser_data.length" class="flex menu-item">
                <va-card class="custom-card box">
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
                            <div class="flex" style="max-height:150px;overflow:scroll">
                                <ul style="list-style: decimal">
                                    <li v-for="(jbrowse,index) in organism.genome_browser_data" :key="index">
                                        <span @click="$emit('onSelected',{model:'jbrowse', id:jbrowse.assembly_accession})"><strong>{{jbrowse.assembly_accession}}</strong></span>
                                    </li>
                                </ul>
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
    organism:Object
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