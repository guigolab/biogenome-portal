<template>
<div v-if="organismLoaded" class="row">
    <div class="flex lg12 md12 sm12 xs12">
        <div v-if="organism.image_urls && organism.image_urls.length" class="row justify--center align--center">
            <va-carousel style="height:75vh" :items="organism.image_urls" :indicators="false" stateful autoscroll infinite :autoscrollInterval="5000" effect="fade"/>
        </div>
        <div class="row custom-card align--center">
            <div class="flex lg4 md4 sm12 xs12">
                <div class="row align--center">
                    <div v-if="organism.image" class="flex">
                        <va-avatar :src="organism.image" size="5rem"/>
                    </div>
                    <div class="flex">
                        <h1 style="text-align:start" class="display-3">
                            {{organism.scientific_name}}
                        </h1>
                    </div>
                </div>
                <div class="row align--center">
                    <div class="flex">
                        <va-chip v-if="organism.insdc_common_name" size="small" style="padding:5px" outline>common name: {{organism.insdc_common_name}}</va-chip>
                        <va-chip v-if="organism.tolid_prefix" size="small" style="padding:5px" outline>tolid: {{organism.tolid_prefix}}</va-chip>
                        <va-chip size="small" style="padding:5px" outline>taxid: {{organism.taxid}}</va-chip>
                        <va-chip v-if="organism.target_list_status" size="small" outline>target_list_status: {{organism.target_list_status}}</va-chip>
                        <va-button-dropdown outline size="small" label="INSDC Status">
                            <div style="font-size:.8rem">
                                <div style="padding:10px" v-for="(status,index) in INSDCStatus" :key="index">
                                    <va-badge dot overlap :color="INSDCStatus.findIndex(stat => stat.label === organism.insdc_status) >= index ? 'success':'warning'">
                                        <va-icon :name="status.icon"/>
                                    </va-badge>
                                    <p style="font-size:.8rem">{{status.label}}</p>
                                </div>
                            </div>
                        </va-button-dropdown>
                        <va-button-dropdown outline size="small" label="GoaT status">
                            <div style="font-size:.8rem">
                                <div style="padding:10px" v-for="(status,index) in GoaTStatus" :key="index">
                                    <va-badge dot overlap :color="GoaTStatus.findIndex(stat => stat.label === organism.goat_status) >= index ? 'success':'warning'">
                                        <va-icon :name="status.icon"/>
                                    </va-badge>
                                    <p style="font-size:.8rem">{{status.label}}</p>
                                </div>
                            </div>
                        </va-button-dropdown>
                    </div>
                </div>
            </div>
            <div class="flex lg8 md8 sm12 xs12">
                <OrganismNavCards @on-selected="handleSelected" :organism="organism"/>
            </div>
        </div>
        <va-divider/>
        <div class="row">
            <div class="flex lg4 md4 sm12 xs12">
                <OrganismOverview :organism="organism"/>
            </div>
            <div class="flex lg8 md8 sm12 xs12">
                <Transition name="slide-up">
                    <va-card v-if="selectedModel === 'biosamples'">
                        {{selectedModel}}
                    </va-card>
                    <va-card v-else-if="selectedModel === 'local_samples'">
                        {{selectedModel}}

                    </va-card>
                    <va-card v-else-if="selectedModel === 'assemblies'">
                        {{selectedModel}}

                    </va-card>
                    <va-card v-else-if="selectedModel === 'experiments'">
                        {{selectedModel}}

                    </va-card>
                    <va-card v-else-if="selectedModel === 'annotations'">
                        {{selectedModel}}

                    </va-card>
                    <va-card v-else-if="selectedModel === 'jbrowse'">
                        {{selectedModel}}

                    </va-card>
                    <va-card v-else-if="selectedModel === 'coordinates'">
                        {{selectedModel}}

                    </va-card>
                </Transition>
            </div>
        </div>

    </div>
</div>
</template>
<script setup>
import OrganismDetails from '../components/OrganismDetails.vue'
import { computed, nextTick, onMounted, reactive, ref, watch } from '@vue/runtime-core'
import {dataIcons,GoaTStatus,INSDCStatus,jbrowse2} from '../../config'
import DataPortalService from '../services/DataPortalService'
import DataTable from '../components/data/DataTable.vue'
import OrganismOverview from '../components/OrganismOverview.vue'
import OrganismSideBar from '../components/OrganismSideBar.vue'
import Jbrowse2 from '../components/Jbrowse2.vue'
import CesiumComponent from '../components/CesiumComponent.vue'
import OrganismNavCards from '../components/OrganismNavCards.vue'
// import MapComponent from '../components/MapComponent.vue'

const selectedModel = ref('')
const showMap = ref(false)
const assembliesWithTrack = ref([])
const props = defineProps({
    taxid:String
})
const showTable = ref(false)
const organismLoaded = ref(false)
//static object
var organism = null
var geoJson = null

const organismData = reactive({
    dataKeys:[],
    loadedItems:[]
})

watch(selectedModel,()=>{
    if(selectedModel.value === 'coordinates'){
        console.log('HERE')
        DataPortalService.getCoordinates(organism.coordinates)
        .then(resp => {
            console.log(resp)
            nextTick(()=>{
                geoJson = resp.data
                showMap.value = true
            })
        }).catch(e => {console.log(e)})
    }else{
        showMap.value = false
    }
})

function handleSelected(payload){
    selectedModel.value = payload
}

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
.status-icon-wrapper{
    padding:15px;
}
.status-icon-wrapper::before{
    top:15px;
    width: 10px;
}
.status-icon-wrapper::after{
    top:15px;
    width: 10px;
}

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