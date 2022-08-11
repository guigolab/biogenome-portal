<template>
<div style="padding-left:15px">
    <div class="row align--center justify--space-between">
        <div class="flex">
            <va-radio 
                v-model="model"
                :option="'taxons'"
                label="Taxonomy"    
            />
            <va-radio
                v-model="model"
                :option="'bioprojects'"
                label="BioProjects"
            />
        </div>
        <div class="flex">
            <va-input
                label="filter"
                v-model="name"
                :placeholder="'search '+ model"
                style="padding:10px"
            >
                <template #append>
                    <va-button :rounded="false" :disabled="name.length <= 1" outline  icon="search" @click="search()">
                        search
                    </va-button>
                </template>
            </va-input>
        </div>
    </div>
    <div style="max-height:100vh;overflow:scroll">
        <va-inner-loading :loading="isLoading">
            <TransitionGroup duration="550">
                <div v-for="(node,index) in treeStore.tree" :key="index">
                    <NodeIterator :node="node" :model="selectedModelObj"/>
                </div>
            </TransitionGroup>
        </va-inner-loading>
    </div>
</div>
</template>
<script setup>
import { computed, onMounted,ref, watch } from 'vue'
import DataPortalService from '../services/DataPortalService'
import {organisms} from '../stores/organisms'
import {tree} from '../stores/tree'
import NodeIterator from './NodeIterator.vue'

const model = ref('taxons')
const isLoading = ref(false)
const name = ref("")
const orgStore = organisms()
const treeStore = tree()
const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION

const modelOptions = [
    {
        label: 'Taxonomy',
        value: 'taxons', 
        searchQuery:DataPortalService.searchTaxons,
        defaultQuery:DataPortalService.getTaxonChildren,
        root:ROOTNODE,
        organismQuery: 'parent_taxid',
        respLabel: 'name',
        metadataFields: ['taxid','leaves','rank'],
        id: 'taxid'
    },
    {
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
]

const filteredModelOptions = computed(()=>{
    if(PROJECT_ACCESSION){
        return modelOptions
    }
    return modelOptions.filter(opt => opt.value !== 'bioprojects')
})

const selectedModelObj = computed(()=>{
    return modelOptions.filter(opt => opt.value === model.value)[0]
})

onMounted(()=>{
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
        treeStore.tree = [resp.data]
        orgStore.selectedNode.name = resp.data.name
        orgStore.selectedNode.metadata = {taxid:resp.data.taxid, leaves: resp.data.leaves, rank: resp.data.rank}
    })
})

watch(model,()=>{
    selectedModelObj.value.id === 'taxid'? orgStore.query.bioproject = null : orgStore.query.parent_taxid = null
    getRoot()
})

function search(){
    isLoading.value=true
    selectedModelObj.value.searchQuery({name:name.value})
    .then(resp => {
        treeStore.tree = resp.data
        isLoading.value=false
    })
    .catch(e => {
        console.log(e)
        isLoading.value=false
    })
}

function getRoot(){
    isLoading.value=true
    selectedModelObj.value.defaultQuery(selectedModelObj.value.root)
    .then(resp => {
        treeStore.tree = [resp.data]
        orgStore.selectedNode.name = resp.data[selectedModelObj.value.respLabel]
        const metadata = {}
        selectedModelObj.value.metadataFields.forEach(f => {
            metadata[f] = resp.data[f]
        })
        orgStore.selectedNode.metadata = metadata
        orgStore.query[selectedModelObj.value.organismQuery] = resp.data[selectedModelObj.value.id]
        console.log(orgStore.query)
        isLoading.value=false
    })
    .catch(e => {
        console.log(e)
        isLoading.value = false
    })
}


</script>
<style>

.node-card{
    margin:5px;
}

ul{
  padding-left:1rem !important;
}

.tree-container{
    font-size: .8rem;
    border-left:2px solid transparent;
    list-style: none;
}
.selected-node{
    border-left:3px solid #7ab615;
}

.child-container{
    cursor: pointer;
    padding:10px;
    text-align: start;
}


</style>