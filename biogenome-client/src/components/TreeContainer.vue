<template>
<div class="custom-card">
    <div class="row align--center custom-card">
        <div class="flex">
            <va-button-dropdown :close-on-content-click="false" flat icon="more_vert">
                <div class="row custom-card">
                    <div class="flex">
                        <va-radio 
                            v-for="(opt,index) in ['taxons','bioprojects']" 
                            :key="index"
                            v-model="model"
                            :option="opt"    
                        />
                    </div>
                </div>
                <div class="row align--center custom-card">
                    <div class="flex">
                        <va-input
                            v-model="name"
                            :placeholder="'search '+ model"
                        />
                    </div>
                    <div class="flex">
                        <va-button :disabled="name.length <= 1" outline  icon="search" @click="search()">
                            submit
                        </va-button>
                    </div>
                </div>
            </va-button-dropdown>
        </div>
        <div class="flex">
            <h6 class="display-6">{{selectedModelObj.label}}</h6>
        </div>
    </div>
    <va-divider/>
    <div style="max-height:66vh;overflow:scroll">
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
import {taxons} from '../stores/taxons'
import {organisms} from '../stores/organisms'
import {tree} from '../stores/tree'
import NodeIterator from './NodeIterator.vue'

const model = ref('taxons')
const isLoading = ref(false)
const name = ref("")
const taxStore = taxons()
const orgStore = organisms()
const treeStore = tree()
const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION

const modelOptions = [
    {
        label: 'taxonomy',
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
        label: 'bioprojects',
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
    if(selectedModelObj.value.id === 'taxid'){
        orgStore.query.parent_taxid = node.taxid
        orgStore.query.bioproject = null
    }else{
        orgStore.query.parent_taxid = null
        orgStore.query.bioproject = node.accession
    }
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

function getData(){
    isLoading.value=true
    if(name.value.length >= 2){
        selectedModelObj.value.searchQuery({name:name.value})
        .then(resp => {
            treeStore.tree = resp.data
            isLoading.value=false
        })
        .catch(e => {
            console.log(e)
            isLoading.value=false
        })
    }else{
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