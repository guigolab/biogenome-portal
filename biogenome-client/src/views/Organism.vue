<template>
<div v-if="organismLoaded" class="row">
    <div class="flex lg12 md12 sm12 xs12">
        <div class="row justify--start align--center">
            <div style="padding:15px" class="flex">
                <h1 style="text-align:start;" class="display-3">{{organism.scientific_name}}</h1>
                <div class="row justify--space-between">
                    <div v-if="organism.insdc_common_name" class="flex">
                        <p class="text--secondary">{{organism.insdc_common_name}}</p>
                    </div>
                    <div class="flex">
                        <p class="text--secondary">{{organism.tolid_prefix}}</p>
                    </div>
                </div>
            </div>
            <div style="padding:15px" class="flex">
                <va-button @click="selectedModel='overview'" :outline="selectedModel!=='overview'">Overview</va-button>
                <va-button v-for="key in organismData.dataKeys" :key="key" @click="selectedModel=key" :color="dataIcons[key].color" :outline="selectedModel!==key" :icon="dataIcons[key].icon">{{key}}</va-button>
                <va-button @click="selectedModel='coordinates'" v-if="organism.coordinates.length" icon="travel_explore" :outline="selectedModel!=='coordinates'">Map</va-button>
                <va-button-dropdown outline color="#752061">
                    <template #label>
                      <va-icon name="view_timeline"/> Genome Browser 
                    </template>
                    <ul>
                        <li v-for="(ass,index) in assembliesWithTrack" :key="index">
                            <va-button @click="toJBrowse(ass)" flat squared>{{ass.assembly_name}}</va-button>
                        </li>
                    </ul>
                </va-button-dropdown>
            </div>
        </div>
        <va-divider/>
        <div class="row">
            <div class="flex lg4 md4 sm12 xs12">
                <OrganismSideBar :lineage="organism.taxon_lineage" :bioprojects="organism.bioprojects"/>
            </div>
            <div class="flex lg8 md8 sm12 xs12">
                <Transition name="slide-up">
                    <va-card class="custom-card" :key="selectedModel" v-if="selectedModel === 'overview'">
                        <va-card-title>
                            {{selectedModel}}
                        </va-card-title>
                        <va-card-content>
                            <OrganismOverview :organism="organism"/>
                        </va-card-content>
                    </va-card>
                    <va-card class="custom-card" :key="selectedModel" v-if="Object.keys(dataIcons).includes(selectedModel)">
                        <va-card-title>
                            {{selectedModel}}
                        </va-card-title>
                        <va-card-content>
                            <DataTable :items="organism[selectedModel]" :columns="dataIcons[selectedModel].fields" :color="dataIcons[selectedModel].color"/>
                        </va-card-content>
                    </va-card>
                    <va-card class="custom-card" :key="selectedModel" v-if="selectedModel === 'coordinates'">
                    </va-card>
                    <va-card class="custom-card" :key="selectedModel" v-if="selectedModel === 'jbrowse'">
                        <Jbrowse2 
                            :assembly="jbrowseSession.assemblyTrack"
                            :tracks="jbrowseSession.annotationTracks"
                        />
                    </va-card>
                </Transition>
            </div>
        </div>
        <!-- <div class="row">
            <div class="flex">
                <va-card>
                    <va-card-title>
                        Lineage
                    </va-card-title>
                    <va-card-content>
                        <ul>
                            <li v-for="taxon in organism.taxon_lineage" :key="taxon.taxid">
                                <p class="text--secondary">{{taxon.name + ' ('+taxon.rank+')'}}</p>
                            </li>
                           <li v-for="taxon in organism.taxon_lineage" :key="taxon.taxid">
                                <router-link :to="{name:'tree-of-life'}"><p>{{taxon.name + ' ('+taxon.rank+')'}}</p></router-link>
                            </li>
                        </ul>
                    </va-card-content>
                </va-card>
            </div>
        </div>
         <va-card class="custom-card">
            <va-card-content>
                <div class="row">
                    <div v-for="key in organismData.dataKeys" :key="key" class="flex">
                        <va-button @click="toggleTable(key)" :color="dataIcons[key].color" outline :icon="dataIcons[key].icon">{{key}}</va-button>
                    </div>
                </div>
                <div v-show="showTable" class="row">
                    <div class="flex">
                        <va-data-table 
                            :items="organismData.loadedItems"
                            sticky-header
                            height="180px"
                            :style="{
                                '--va-data-table-scroll-table-color': 'white',
                            }"
                            >
                            <template #header(metadata)></template>
                            <template #header(sub_samples)>related samples</template>
                            <template #cell(chromosomes)="{ rowData }">
                                <va-button-dropdown v-if="rowData.chromosomes && rowData.chromosomes.length" size="small" flat>
                                    <ul>
                                        <li v-for="chr in rowData.chromosomes" :key="chr">
                                            <a class="link">{{chr}}</a>
                                        </li>
                                    </ul>
                                </va-button-dropdown>
                            </template>
                            <template #cell(sub_samples)="{ rowData }">
                                <va-button-dropdown v-if="rowData.sub_samples && rowData.sub_samples.length" size="small" flat>
                                    <ul>
                                        <li v-for="acc in rowData.sub_samples" :key="acc">
                                            <a class="link">{{acc}}</a>
                                        </li>
                                    </ul>
                                </va-button-dropdown>
                            </template>
                            <template #cell(metadata)="{ rowData }"><va-icon name="search" :color="dataIcons[key].color" @click="toggledMetadata(rowData)"/></template>
                        </va-data-table>
                    </div>
                </div>
            </va-card-content>
        </va-card> -->
    </div>
</div>
    <!-- <div>
        Organism details:
        photo??
        <va-avatar>
        </va-avatar>
        <va-card>
            <va-card-title>
            </va-card-title>
        </va-card>
        <va-card>
            <va-card-title>
            </va-card-title>
        </va-card>
        lineage
        map
        bioproject
        taxid,tolid
        goat status
        insdc status

        Organism data:
        biosamples
        local_samples
        assemblies
        experiments
        annotations
         -->
</template>
<script setup>
import OrganismDetails from '../components/OrganismDetails.vue'
import { computed, nextTick, onMounted, reactive, ref } from '@vue/runtime-core'
import {dataIcons,GoaTStatus,INSDCStatus,jbrowse2} from '../../config'
import DataPortalService from '../services/DataPortalService'
import DataTable from '../components/data/DataTable.vue'
import OrganismOverview from '../components/OrganismOverview.vue'
import OrganismSideBar from '../components/OrganismSideBar.vue'
import Jbrowse2 from '../components/Jbrowse2.vue'
// import MapComponent from '../components/MapComponent.vue'

const selectedModel = ref('overview')

const assembliesWithTrack = ref([])

const props = defineProps({
    taxid:String
})
const showTable = ref(false)
const organismLoaded = ref(false)
const hasCoordinates = ref(false)
//static object
var organism = null
var geoJson = null

const organismData = reactive({
    dataKeys:[],
    loadedItems:[]
})


const jbrowseSession = reactive({
    assemblyTrack: null,
    annotationTracks:[]
})

function toggledMetadata(value){
    console.log(value)
}
function toggleTable(key){
    showTable.value = false
    organismData.loadedItems = organism[key]
    showTable.value = true
}
onMounted(()=>{
    DataPortalService.getOrganism(props.taxid)
    .then(response => {
        organismLoaded.value = false
        organism = response.data
        organismData.dataKeys = Object.keys(dataIcons).filter(d => organism[d].length)
        organismData.loadedItems = organism[organismData.dataKeys[0]]
        organismLoaded.value = true
        showTable.value = true
        organism.assemblies.filter(ass => ass.track)
        .forEach(ass => assembliesWithTrack.value.push(ass))
        // if (organism.coordinates.length){
        //     return DataPortalService.getCoordinates(organism.coordinates)
        // }
    })
})

function toJBrowse(assembly){
    const assToLoad = {...jbrowse2.assemblyObject}
    console.log(assToLoad)
    assToLoad.name = assembly.assembly_name
    assToLoad.sequence.trackId = assembly.accession
    assToLoad.sequence.adapter.fastaLocation.uri = assembly.track.fasta_location
    assToLoad.sequence.adapter.faiLocation.uri = assembly.track.fai_location
    assToLoad.sequence.adapter.gziLocation.uri = assembly.track.gzi_location
    jbrowseSession.assemblyTrack = {...assToLoad}
    organism.annotations.filter(ann => ann.assembly_accession === assembly.accession)
    .forEach(ann => {
        const annToLoad = {...jbrowse2.annotationTrackObject}
        annToLoad.name = ann.name
        annToLoad.trackId = ann.name
        annToLoad.assemblyNames = [assembly.assembly_name]
        annToLoad.adapter.gffGzLocation.uri = ann.gff_gz_location
        annToLoad.adapter.index.location.uri = ann.tab_index_location
        const existingAnnotation = jbrowseSession.annotationTracks.filter(annotation => ann.name === annotation.name)
        if(!existingAnnotation.length){
            jbrowseSession.annotationTracks.push(annToLoad)
        }
    })
    selectedModel.value = 'jbrowse'

    
}


</script>
<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease-out;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>