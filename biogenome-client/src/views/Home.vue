<template>
<div class="row">
    {{screenWidth}}
    {{isMobile}}
    <div class="flex lg12 md12 sm12 xs12">
        <!-- <va-inner-loading :loading="orgStore.isLoading"> -->
            <div class="row custom-card justify--start">
                <div class="flex lg3 md3 sm12 xs12">
                    <!-- <FilterSideBar></FilterSideBar> -->
                    <!-- <va-card class="custom-card">
                        <va-collapse
                            class="box"
                            header="Scientific Name"
                            v-model="showScientificName"
                            solid
                        >
                            <div class="row justify--center collapse-row">
                                <div class="flex lg12 md12 sm12 xs12">
                                    <va-input outline class="side-input" label="Scientific Name">
                                        <template #append>
                                            <va-button :rounded="false" outline icon="search"/>
                                        </template>
                                    </va-input>
                                </div>
                            </div>
                        </va-collapse>
                        <va-collapse
                            class="box"
                            :color-all="true"
                            header="INSDC Common Name"
                            v-model="showCommonName"
                            color="white"
                            solid
                        >
                            <div class="row justify--center collapse-row">
                                <div class="flex lg12 md12 sm12 xs12">
                                    <va-input outline class="side-input" label="Common Name">
                                        <template #append>
                                            <va-button :rounded="false" outline icon="search"/>
                                        </template>
                                    </va-input>
                                </div>
                            </div>
                        </va-collapse>
                        <va-collapse
                            class="box"
                            :color-all="true"
                            v-model="showTolid"
                            header="ToLID"
                            color="white"
                            solid
                        >
                            <div class="row justify--center collapse-row">
                                <div class="flex lg12 md12 sm12 xs12">
                                    <va-input outline class="side-input" label="ToLID">
                                        <template #append>
                                            <va-button :rounded="false" outline icon="search"/>
                                        </template>
                                    </va-input>
                                </div>
                            </div>
                        </va-collapse>
                        <va-collapse
                            class="box"
                            :color-all="true"
                            header="Tax ID"
                            v-model="showTaxid"
                            color="white"
                            solid
                        >
                            <div class="row justify--center collapse-row">
                                <div class="flex lg12 md12 sm12 xs12">
                                    <va-input outline class="side-input" label="Tax ID">
                                        <template #append>
                                            <va-button :rounded="false" outline icon="search"/>
                                        </template>
                                    </va-input>
                                </div>
                            </div>
                        </va-collapse>
                        <va-collapse
                            class="box"
                            :color-all="true"
                            header="Taxonomy"
                            v-model="showTaxonomy"
                            color="white"
                            solid
                        >
                            <div>
                                <div class="row justify--center collapse-row">
                                    <div class="flex lg12 md12 sm12 xs12">
                                        <va-input outline class="side-input" label="Taxonomy">
                                            <template #append>
                                                <va-button :rounded="false" outline icon="search"/>
                                            </template>
                                        </va-input>
                                    </div>
                                </div>
                                <va-divider/>
                                <div class="row justify--center collapse-row">
                                    <div style="background-color:#eff3f8 ;" class="flex lg10 md10 sm12 xs12">
                                        <div style="width:100%;height:400px;overflow: scroll;">
                                            <va-inner-loading :loading="isTaxonTreeLoading">
                                                <div v-for="(node,index) in [treeStore.taxonomyTree]" :key="index">
                                                    <NodeIterator :node="node" :model="taxonModel"/>
                                                </div>
                                            </va-inner-loading>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </va-collapse>
                        <va-collapse
                            class="box"
                            :color-all="true"
                            header="BioProjects"
                            v-model="showBioprojects"
                            color="white"
                            solid
                        >
                            <div>
                                <div class="row justify--center collapse-row">
                                    <div class="flex lg12 md12 sm12 xs12">
                                        <va-input outline class="side-input" label="BioProjects">
                                            <template #append>
                                                <va-button :rounded="false" outline icon="search"/>
                                            </template>
                                        </va-input>
                                    </div>
                                </div>
                                <va-divider/>
                                <div class="row justify--center collapse-row">
                                    <div style="background-color:#eff3f8 ;" class="flex lg10 md10 sm12 xs12">
                                        <div style="width:100%;height:400px;overflow: scroll;background-color:#eff3f8 ;">
                                            <va-inner-loading :loading="isBioprojectTreeLoading">
                                                <div v-for="(node,index) in [treeStore.bioprojectsTree]" :key="index">
                                                    <NodeIterator :node="node" :model="bioprojectModel"/>
                                                </div>
                                            </va-inner-loading>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </va-collapse>
                    </va-card> -->
                    <TreeContainer/>
                </div>
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
                                        <router-link :to="{name:'map',params:{accession:orgStore.selectedNode.metadata.accession}}"><va-icon size="large" name="travel_explore"/></router-link>
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
                    <OrganismList @data-selected="getData" @organism-selected="getOrganism" :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
                    <!-- <NewDataCards/> -->
                </div>
            </div>
            <!-- <div class="row">
                <div class="flex lg4 md4 sm12 xs12">

                    <TreeContainer/>
                </div>
                <div class="flex lg8 md8">
                    <OrganismList @data-selected="getData" @organism-selected="getOrganism" :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
                </div>
            </div> 
          -->
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
</style>