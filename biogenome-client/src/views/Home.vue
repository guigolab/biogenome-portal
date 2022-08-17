<template>
<div>
    <div class="row custom-card align--center justify--space-between">
        <div class="flex">
            <div class="row align--center justify--space-between">
                <div class="flex">
                    <h1 style="text-align:start" class="display-3">
                        {{orgStore.selectedNode.name}}
                    </h1>
                    <div class="row">
                        <div class="flex">
                            <va-chip size="small" style="padding:5px" outline v-for="key in Object.keys(orgStore.selectedNode.metadata)" :key="key">{{key +': '+orgStore.selectedNode.metadata[key]}}</va-chip>
                        </div>
                    </div>
                </div>
                <div class="flex">
                    <DataCards/>
                </div>
            </div>
        </div>
        <div class="flex">
            <va-button-toggle
                size="small"
                outline
                v-model="currentModel"
                :options="filteredModelOptions"
            />
        </div>
    </div>
    <va-divider/>
    <div class="row custom-card justify--space-between">
        <div class="flex lg6 md6 sm12 xs12">
            <va-card class="custom-card">
                <va-card-title>
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <p>{{orgStore.selectedNode.name+ "'s children"}}</p>
                        </div>
                        <div class="flex">
                            <va-icon 
                                :name="currentModel === 'taxons'? 'pets':'science'"
                            >
                            </va-icon>
                        </div>
                    </div>
                </va-card-title>
                <va-card-content style="max-height:50vh;overflow:scroll">
                    <va-list>
                        <va-list-item
                            v-for="(node, index) in orgStore.selectedNode.children"
                            :key="index"
                            @click="getNode(node)"
                        >
                        <va-list-item-section style="text-align:start">
                            <va-list-item-label>
                            {{ node.title || node.name}}
                            </va-list-item-label>
                            <va-list-item-label caption>
                                {{ node.rank || node.accession}}
                            </va-list-item-label>
                        </va-list-item-section>

                        <va-list-item-section icon>
                            <va-icon
                                name="visibility"
                            />
                        </va-list-item-section>
                        </va-list-item>
                    </va-list>
                </va-card-content>
            </va-card>
        </div>
        <div class="flex lg6 md6 sm12 xs12">
            <OrganismList :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
        </div>
    </div>
</div>
</template>
<script setup>
import OrganismList from '../components/OrganismList.vue'
import NodeIterator from '../components/NodeIterator.vue'
import NewDataCards from '../components/NewDataCards.vue'
import DataCards from '../components/DataCards.vue'
import {organisms} from '../stores/organisms'
import { tree } from '../stores/tree'
import {onMounted,computed,watch,ref, nextTick, reactive} from 'vue'
import DataPortalService from '../services/DataPortalService'
import TreeContainer from '../components/TreeContainer.vue'
import FilterSideBar from '../components/FilterSideBar.vue'



/*
home page containing search filter button toggle for taxon or project
and scrollable horizontal tree cluster
*/
const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION

const modelOptions = [
    {
        text: 'Taxonomy',
        value: 'taxons', 
        icon: 'pets'
    },
    {
        text: 'BioProjects',
        value: 'bioprojects',
        icon: 'science'
    }
]
const currentModel = ref('taxons')
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

const filteredModelOptions = computed(()=>{
    if(PROJECT_ACCESSION){
        return modelOptions
    }
    return modelOptions.filter(opt => opt.value !== 'bioprojects')
})

function getNode(node){
    if(node.accession){
        orgStore.query.bioproject = node.accession
        orgStore.query.parent_taxid = ROOTNODE
        orgStore.getProjectRootNode()
    }else{
        orgStore.query.bioproject = null
        orgStore.query.parent_taxid = node.taxid
        orgStore.getTaxonRootNode()
    }
    orgStore.loadOrganisms()
}

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
    orgStore.getTaxonRootNode()

})

watch(currentModel, ()=>{
    switch (currentModel.value){
        case 'taxons':
            orgStore.getTaxonRootNode()
            break;
        case 'bioprojects':
            orgStore.getProjectRootNode()
            break;
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