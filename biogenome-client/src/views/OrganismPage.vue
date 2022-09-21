<template>
<div v-if="organismLoaded" class="row">
    <div class="flex lg12 md12 sm12 xs12">
        <div v-if="organism.image_urls && organism.image_urls.length" class="row justify--center align--center">
            <va-carousel style="height:75vh" :items="organism.image_urls" :indicators="false" stateful autoscroll infinite :autoscrollInterval="5000" effect="fade"/>
        </div>
        <div class="row custom-card align--center">
            <div class="flex lg6 md6 sm12 xs12">
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
            <div class="flex lg6 md6 sm12 xs12">
                <OrganismNavCards @on-selected="handleSelected" :organism="organism"/>
            </div>
        </div>
        <va-divider/>
        <div class="row">
            <div class="flex lg4 md12 sm12 xs12">
                <Transition name="slide-fade">
                <va-card v-if="organism.metadata && Object.keys(organism.metadata).length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                Metadata
                            </div>
                            <div class="flex">
                                <va-icon 
                                    name="info"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div v-for="(key,index) in Object.keys(organism.metadata)" :key="index" class="row justify--space-between align--center" style="padding:5px">
                            <div class="flex">
                                <p style="text-align:start">{{key}}</p>
                            </div>
                            <div class="flex">
                                <p style="text-align:start">{{organism.metadata[key]}}</p>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
                </Transition>
                <Transition name="slide-fade">
                <va-card v-if="organism.common_names && organism.common_names.length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                Names
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div v-for="(name,index) in organism.common_names" :key="index" class="row justify--space-between align--center" style="padding:5px">
                            <div class="flex lg4 md4 sm4 xs4">
                                <p style="text-align:start">{{name.value}}</p>
                            </div>
                            <div class="flex lg4 md4 sm4 xs4">
                                <span style="text-align:start">{{name.lang}}</span>
                                <va-icon style="margin-left:5px" name="language"/>
                            </div>
                            <div v-if="name.locality" class="flex lg4 md4 sm4 xs4">
                                <span style="text-align:start">{{name.locality}}</span>
                                <va-icon style="margin-left:5px" name="location_on"/>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
                </Transition>
                <Transition name="slide-fade">
                <va-card v-if="organism.publications && organism.publications.length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                Publications
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div v-for="(pub,index) in organism.publications" :key="index" class="row justify--space-between align--center" style="padding:5px">
                            <div class="flex lg4 md4 sm4 xs4">
                                <p style="text-align:start">{{pub.id}}</p>
                            </div>
                            <div class="flex lg4 md4 sm4 xs4">
                                <p style="text-align:start">{{pub.source}}</p>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
                </Transition>
                <Transition name="slide-fade">
                <va-card v-if="organism.bioprojects && organism.bioprojects.length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                bioprojects
                            </div>
                            <div class="flex">
                                <va-icon 
                                    name="science"
                                    color="success"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div v-for="(pr,index) in organism.bioprojects" :key="index" class="row justify--space-between align--center" style="padding:5px">
                            <div class="flex lg8 md8 sm8 xs8">
                                <p style="text-align:start">{{pr.title}}</p>
                            </div>
                            <div class="flex lg4 md4 sm4 xs4">
                                <va-chip @click="toPage({name:'bioprojects',params:{id:pr.accession}})" size="small" outline>{{pr.accession}}</va-chip>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
                </Transition>
                <va-card class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                Lineage
                            </div>
                            <div class="flex">
                                <va-icon 
                                    name="pets"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <div v-for="(node,index) in organism.taxon_lineage" :key="index" class="row justify--space-between align--center" style="padding:5px">
                            <div style="text-align:start" class="flex lg8 md8 sm8 xs8">
                                <va-chip @click="toPage({name:'taxons',params:{id:node.taxid}})" size="small" outline>{{node.name}}</va-chip>
                            </div>
                            <div class="flex lg4 md4 sm4 xs4">
                                <p style="text-align:start">{{node.rank}}</p>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </div>
            <div class="flex lg8 md12 sm12 xs12">
                <Transition name="slide-fade">
                <va-card stripe :stripe-color="dataIcons.biosamples.color" v-if="organism.biosamples && organism.biosamples.length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                biosamples
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
                    <va-card-content style="overflow:scroll">
                        <va-data-table
                            :items="organism.biosamples"
                            :columns="['accession', 'organism_part','related_samples','metadata']"
                        >
                        <template #cell(accession)="{ rowData }">
                            <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${rowData.accession}`" class="link">{{rowData.accession}}</a>
                        </template>
                        <template #cell(organism_part)="{ rowData }">
                            <p>{{rowData.metadata.tissue || rowData.metadata.organism_part || rowData.metadata["organism part"]}}</p>
                        </template>
                        <template #cell(related_samples)="{ rowData }">
                            <va-button-dropdown flat size="small" v-if="rowData.sub_samples && rowData.sub_samples.length">
                                <ul style="max-height:300px;overflow:scroll">
                                    <!-- add async info on hover?? -->
                                    <li v-for="(relatedSample,index) in rowData.sub_samples" :key="index">
                                        <va-button flat @click="getRelatedSample(relatedSample)">{{relatedSample}}</va-button>
                                    </li>
                                </ul>
                            </va-button-dropdown>
                        </template>
                        <template #cell(metadata)="{ rowData }"><va-icon name="search" :color="color" @click="toggleMetadata(rowData)"/></template>
                        </va-data-table>
                    </va-card-content>
                </va-card>
                </Transition>
                <Transition name="slide-fade">
                <va-card stripe :stripe-color="dataIcons.local_samples.color" v-if="organism.local_samples && organism.local_samples.length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                local samples
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
                    <va-card-content style="overflow:scroll">
                        <va-data-table
                            :items="organism.local_samples"
                            :columns="['local_id', 'organism_part','metadata']"
                        >
                        <template #cell(accession)="{ rowData }">
                            <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${rowData.accession}`" class="link">{{rowData.accession}}</a>
                        </template>
                        <template #cell(organism_part)="{ rowData }">
                            <p>{{rowData.metadata.tissue || rowData.metadata.ORGANISM_PART}}</p>
                        </template>
                        <template #cell(metadata)="{ rowData }"><va-icon name="search" :color="color" @click="toggleMetadata(rowData)"/></template>
                        </va-data-table>
                    </va-card-content>
                </va-card>
                </Transition>
                <Transition name="slide-fade">
                <va-card stripe :stripe-color="dataIcons.assemblies.color" v-if="organism.assemblies && organism.assemblies.length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                assemblies
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
                    <va-card-content style="overflow:scroll">
                        <va-data-table
                            :items="organism.assemblies"
                            :columns="['accession', 'assembly_name','metadata']"
                        >
                        <template #cell(accession)="{ rowData }">
                            <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${rowData.accession}`" class="link">{{rowData.accession}}</a>
                        </template>
                        <template #cell(metadata)="{ rowData }"><va-icon name="search" :color="color" @click="toggleMetadata(rowData)"/></template>
                        </va-data-table>
                    </va-card-content>
                </va-card>
                </Transition>
                <Transition name="slide-fade">
                <va-card stripe :stripe-color="dataIcons.experiments.color" v-if="organism.experiments && organism.experiments.length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                experiments
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
                    <va-card-content style="overflow:scroll">
                        <va-data-table
                            :items="organism.experiments"
                            :columns="['experiment_accession', 'instrument_platform','metadata']"
                        >
                        <template #cell(experiment_accession)="{ rowData }">
                            <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${rowData.experiment_accession}`" class="link">{{rowData.experiment_accession}}</a>
                        </template>
                        <template #cell(metadata)="{ rowData }"><va-icon name="search" :color="color" @click="toggleMetadata(rowData)"/></template>
                        </va-data-table>
                    </va-card-content>
                </va-card>
                </Transition>
                <Transition name="slide-fade">
                <va-card stripe :stripe-color="dataIcons.annotations.color" v-if="organism.annotations && organism.annotations.length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                annotations
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
                    <va-card-content style="overflow:scroll">
                        <va-data-table
                            :items="organism.annotations"
                            :columns="['name', 'assembly_accession','metadata','links']"
                        >
                        <template #cell(metadata)="{ rowData }"><va-icon name="search" :color="color" @click="toggleMetadata(rowData)"/></template>
                        <template #cell(links)="{ rowData }">
                            <va-button-dropdown flat size="small" v-if="rowData.links && rowData.links.length">
                                <ul style="max-height:300px;overflow:scroll">
                                    <li v-for="(link,index) in rowData.links" :key="index">
                                        <a target="_blank" :href="link">{{link}}</a>
                                    </li>
                                </ul>
                            </va-button-dropdown>
                        </template>
                        </va-data-table>
                    </va-card-content>
                </va-card>
                </Transition>
                <Transition name="slide-fade">
                <va-card stripe stripe-color="#752061" v-if="organism.genome_browser_data && organism.genome_browser_data.length" class="custom-card">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                genome browser data
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
                    <va-card-content style="overflow:scroll">
                        <va-data-table
                            :items="organism.genome_browser_data"
                            :columns="['assembly_accession','metadata','actions']"
                        >
                        <template #cell(metadata)="{ rowData }"><va-icon name="search" :color="color" @click="toggleMetadata(rowData)"/></template>
                        <template #cell(actions)="{ rowData }"><va-chip outline color="#752061" @click="loadTrack(rowData)">See in JBrowse2</va-chip></template>
                        </va-data-table>
                    </va-card-content>
                </va-card>
                </Transition>
                <Transition name="slide-fade">
                <Jbrowse2 v-if="showJBrowse" :assembly="jbrowseSession.assemblyTrack" :tracks="jbrowseSession.annotationTracks"/>
                </Transition>
                <Transition name="slide-fade">
                <va-card  v-if="showMap" class="custom-card">
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
                        <CesiumComponent :geojson="geoJson"/>
                    </va-card-content>
                </va-card>
                </Transition>
            </div>
        </div>
    </div>
    <va-modal v-model="showMetadata" :title="toggledMetadata.name">
        <ul>
            <li style="padding:10px" v-for="key in Object.keys(toggledMetadata.metadata)" :key="key">
                <strong>{{key+ ': '}}</strong>{{toggledMetadata.metadata[key]}}
                <va-divider/>
            </li>
        </ul>
    </va-modal>
</div>
</template>
<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from '@vue/runtime-core'
import {dataIcons,GoaTStatus,INSDCStatus,jbrowse2} from '../../config'
import DataPortalService from '../services/DataPortalService'
import Jbrowse2 from '../components/Jbrowse2.vue'
import CesiumComponent from '../components/CesiumComponent.vue'
import OrganismNavCards from '../components/OrganismNavCards.vue'
import { useRouter } from 'vue-router'
import BioSampleService from '../services/BioSampleService'

const router = useRouter()
const showJBrowse = ref(false)
const selectedModel = ref('')
const showMap = ref(false)
const assembliesWithTrack = ref([])
const props = defineProps({
    taxid:String
})
const showMetadata = ref(false)

const toggledMetadata = reactive({
    name:'',
    metadata:{}
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

// watch(selectedModel,()=>{
//     if(selectedModel.value === 'coordinates'){
//         DataPortalService.getCoordinates(organism.coordinates)
//         .then(resp => {
//             nextTick(()=>{
//                 geoJson = resp.data
//                 showMap.value = true
//             })
//         }).catch(e => {console.log(e)})
//     }else{
//         showMap.value = false
//     }
// })

function handleSelected(payload){
    selectedModel.value = payload
}
function toggleMetadata(rowData){
    toggledMetadata.name = rowData.accession || rowData.experiment_accession || rowData.local_id || rowData.name
    toggledMetadata.metadata = {...rowData.metadata}
    showMetadata.value = true    
}

function getRelatedSample(sampleAccession){
    BioSampleService.getBioSample(sampleAccession)
    .then(resp => {
        toggledMetadata.name = sampleAccession
        toggledMetadata.metadata = {...resp.data.metadata}
        nextTick(()=>{
            showMetadata.value = true
        })
    })
}

const jbrowseSession = reactive({
    assemblyTrack: null,
    annotationTracks:[]
})

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
        organismData.dataKeys = Object.keys(dataIcons).filter(d => organism[d] && organism[d].length)
        organismData.loadedItems = organism[organismData.dataKeys[0]]
        organismLoaded.value = true
        showTable.value = true
        organism.assemblies.filter(ass => ass.track)
        .forEach(ass => assembliesWithTrack.value.push(ass))
        return DataPortalService.getCoordinates(organism.coordinates)
    }).then(resp => {
        if(resp.data){
            geoJson = resp.data
            showMap.value=true
        }
    } )
})

function loadTrack(rowData){
    showJBrowse.value=false
    const assTrack = {...jbrowse2.assemblyObject}
    assTrack.name = rowData.assembly_name || rowData.assembly_accession
    assTrack.sequence.trackId = rowData.assembly_accession
    assTrack.sequence.adapter.fastaLocation.uri = rowData.assembly_track.fasta_location
    assTrack.sequence.adapter.faiLocation.uri = rowData.assembly_track.fai_location
    assTrack.sequence.adapter.gziLocation.uri = rowData.assembly_track.gzi_location
    if(rowData.assembly_track.chrom_alias){
        const refNameAliases = {...jbrowse2.refNameAliases}
        refNameAliases.adapter.location.uri= rowData.assembly_track.chrom_alias
        assTrack.refNameAliases = {...refNameAliases}
    }
    jbrowseSession.assemblyTrack = {...assTrack}
    rowData.annotation_tracks.forEach(ann => {
        const annToLoad = {...jbrowse2.annotationTrackObject}
        annToLoad.name = ann.name
        annToLoad.trackId = ann.name+' '+rowData.assembly_accession
        annToLoad.assemblyNames = [rowData.assembly_name || rowData.assembly_accession]
        annToLoad.adapter.gffGzLocation.uri = ann.gff_gz_location
        annToLoad.adapter.index.location.uri = ann.tab_index_location
        jbrowseSession.annotationTracks.push(annToLoad)
    })
    console.log(jbrowseSession.assemblyTrack)
    console.log(jbrowseSession.annotationTracks)
    showJBrowse.value = true
}


function toPage(route){
    router.push(route)
}

</script>
<style scoped>
.slide-fade-enter-active {
  transition: all 0.2s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
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