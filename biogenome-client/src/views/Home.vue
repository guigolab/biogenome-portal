<template>
<div class="row">
    <div class="flex lg3 md3 sm2 xs2">
        <div v-if ="isMobile">
            <va-button>toggle</va-button>
        </div>
        <div v-else>
            <TreeContainer/>
        </div>
    </div>
    <div class="flex lg9 md9 sm10 xs10">
        <!-- <va-inner-loading :loading="orgStore.isLoading"> -->
            <div class="row custom-card justify--start">
                <!-- <div class="flex lg3 md3 sm12 xs12">
                    <TreeContainer/>
                </div> -->
                <div class="flex lg9 md9 sm12 xs12">
                    <div class="row align--center custom-card">
                        <div class="flex lg6 md6 sm12 xs12">
                            <div class="row">
                                <div class="flex">
                                    <h1 style="text-align:start" class="display-3">
                                        {{orgStore.selectedNode.name}}
                                    </h1>
                                </div>
                            </div>
                            <div class="row align--center">
                                <div class="flex">
                                    <va-chip size="small" style="padding:5px" outline v-for="key in Object.keys(orgStore.selectedNode.metadata)" :key="key">{{key +': '+orgStore.selectedNode.metadata[key]}}</va-chip>
                                </div>
                                <div v-if="hasCoordinates" class="flex">
                                    <va-popover :message="'3D World Map'">
                                        <router-link :to="{name:'map',params:{accession:orgStore.selectedNode.metadata.accession}}"><va-icon style="padding:5px" size="large" name="travel_explore"/></router-link>
                                    </va-popover>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row align--center">
                        <div class="flex lg12 md12 sm12 xs12">
                            <DataCards/>
                        </div>
                    </div>
                    <OrganismList :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
                </div>
            </div>
    </div>
</div>
</template>
<script setup>
import OrganismList from '../components/OrganismList.vue'
import NodeIterator from '../components/NodeIterator.vue'
import DataCards from '../components/DataCards.vue'
import {organisms} from '../stores/organisms'
import { tree } from '../stores/tree'
import {onMounted,computed,watch,ref, nextTick, reactive} from 'vue'
import DataPortalService from '../services/DataPortalService'
import TreeContainer from '../components/TreeContainer.vue'
import FilterSideBar from '../components/FilterSideBar.vue'

const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION

const taxonModel = {
    label: 'Taxonomy',
    value: 'taxons', 
    searchQuery:DataPortalService.searchTaxons,
    defaultQuery:DataPortalService.getTaxonChildren,
    root:ROOTNODE,
    organismQuery: 'parent_taxid',
    respLabel: 'name',
    metadataFields: ['taxid','leaves','rank'],
    id: 'taxid'
}
const bioprojectModel = {
    label: 'BioProjects',
    value: 'bioprojects', 
    searchQuery:DataPortalService.searchBioprojects,
    defaultQuery:DataPortalService.getBioProjectChildren,
    root:PROJECT_ACCESSION,
    organismQuery: 'bioproject',
    respLabel: 'title',
    metadataFields: ['accession'],
    id: 'accession'
}
const showBioprojects = ref(false)
const showTaxonomy = ref(false)
const showScientificName = ref(false)
const showCommonName = ref(false)
const showTaxid = ref(false)
const showTolid = ref(false)
const isTaxonTreeLoading = ref(false)
const isBioprojectTreeLoading = ref(false)
const orgStore = organisms()
const toggle = ref(true)
const organismLoaded = ref(false)
const dataLoaded = ref(false)
const screenWidth = ref(screen.width)
const isMobile = computed(() => screenWidth.value <= 810)
const treeStore = tree()
var organism = reactive()

var data = reactive({
    organismName: String,
    values: Array,
    model: String
})


const hasCoordinates = computed(()=>{
    return orgStore.selectedNode.metadata.accession && orgStore.organisms.some(org => org.coordinates.length)
})


function getData(value){
    dataLoaded.value = false
    data.model = value.model
    data.organismName = value.name
    DataPortalService.getData(value.model, {ids: value.ids})
    .then(resp => {
        nextTick(()=>{
            data.values = resp.data
            dataLoaded.value = true
        })
    })
}

onMounted(()=>{
    orgStore.loadOrganisms()
})

watch(showTaxonomy,()=>{
    if(showTaxonomy.value){
        getTaxons()
    }
})
watch(showBioprojects,()=>{
    if(showBioprojects.value){
        getBioprojects()
    }
})

watch(orgStore.query, ()=>{
    orgStore.loadOrganisms()
},{deep:true})

function getOrganism(value){
    organismLoaded.value = false
    DataPortalService.getOrganism(value)
    .then(resp => {
        nextTick(()=>{
            organism = resp.data
            organismLoaded.value = true
        })
    })
}

function getTaxons(){
    isTaxonTreeLoading.value = true
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
            treeStore.taxonomyTree = resp.data
            isTaxonTreeLoading.value = false

    }).catch(e => {
        console.log(e)
        isTaxonTreeLoading.value = false
    })
}

function getBioprojects(){
    isBioprojectTreeLoading.value = true
    DataPortalService.getBioProjectChildren(PROJECT_ACCESSION)
    .then(resp => {
        treeStore.bioprojectsTree = resp.data
        isBioprojectTreeLoading.value = false
    })
    .catch(e => {
        console.log(e)
        isBioprojectTreeLoading.value = false
    })
}

function updateQuery(dataKey){
    orgStore.query[dataKey] = orgStore.query[dataKey] ? null : true
}

</script>
<style scoped>
.side-input{
    padding: 15px;
}
.collapse-row{
    background-color: white;
}

.sidebar{
    background-color: #0c7c59;
}
</style>