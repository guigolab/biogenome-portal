<template>
    <va-card class="custom-card box">
        <va-card-title>
            <div class="row justify--space-between align--center">
                <div class="flex">
                    <p>Taxonomy</p>
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
            <div class="row justify--space-between">
                <div class="flex">
                    <va-input
                        label="filter"
                        v-model="name"
                        :placeholder="'search taxon'"
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
            <div class="row">
                <div class="flex">
                    <div style="max-height:100vh;overflow:scroll">
                        <va-inner-loading :loading="isLoading">
                            <TransitionGroup duration="550">
                                <div v-for="(node,index) in treeStore.tree" :key="index">
                                    <NodeIterator :node="node" :model="taxonModel"/>
                                </div>
                            </TransitionGroup>
                        </va-inner-loading>
                    </div>                
                </div>
            </div>
        </va-card-content>
    </va-card> 
</template>
<script setup>
import {ref} from 'vue'
import {tree} from '../stores/tree'
import { organisms } from '../stores/organisms';
import DataPortalService from '../services/DataPortalService';

const taxonModel = {
    label: 'Taxonomy',
    value: 'taxons', 
    root:ROOTNODE,
    organismQuery: 'parent_taxid',
    respLabel: 'name',
    metadataFields: ['taxid','leaves','rank'],
    id: 'taxid'
}
const name = ref('')
const isLoading = ref(false)
const treeStore = tree()
const orgStore = organisms()
const ROOTNODE = import.meta.env.VITE_ROOT_NODE

function search(){
    isLoading.value=true
    DataPortalService.searchTaxons({name: name.value})
    .then(resp => {
        treeStore.taxonomyTree = resp.data
        isLoading.value=false
    })
    .catch(e => {
        console.log(e)
        isLoading.value=false
    })
}

function getRoot(){
    isLoading.value=true
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
        treeStore.taxonomyTree = [resp.data]
        orgStore.selectedNode.name = resp.data.name
        orgStore.selectedNode.metadata = {taxid:resp.data.taxid, leaves: resp.data.leaves, rank: resp.data.rank}
    })

}

</script>