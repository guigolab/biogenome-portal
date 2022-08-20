<template>
<div>
    <va-chip>{{selectedRoot.name}}</va-chip>
    <div class="row align--center justify--space-between">
        <div class="flex lg6 md6 sm12 xs12">
            <va-card class="custom-card">
                <va-card-title>
                    <va-input label="search taxon"
                        placeholder="ex. Aves"
                        v-model="taxonInput">
                    </va-input>
                </va-card-title>
                <va-card-content>
                    <va-chip @click="selectedRoot=taxon" v-for="(taxon,index) in result" :key="index">{{taxon.name}}</va-chip>
                </va-card-content>
            </va-card>
            <va-card class="custom-card">
                <va-card-title>
                    <div class="row">
                        <div class="flex">
                            species selection
                        </div>
                        <div v-if="orgStore.total <= treeStore.limit" class="flex">
                            <va-checkbox label="select all" v-model="selectAll"></va-checkbox>
                        </div>
                    </div>
                </va-card-title>
                <va-card-content>
                    <OrganismFilter/>
                    <va-select
                    v-model="orgStore.query.parent_taxid"
                    :options="['8782']">

                    </va-select>
                        <va-chip v-for="(org,index) in filteredOrganisms" :key="index" icon="add" @click="addOrganism(org)" outline>
                            {{org.scientific_name}}
                        </va-chip>
                </va-card-content>
            </va-card>
        </div>
        <div class="flex lg6 md6 sm12 xs12">
            <va-card class="custom-card">
                <va-card-title>
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            selected species
                        </div>
                        <div class="flex">
                            {{`${treeStore.loadedSpecies.length}/${treeStore.limit}`}}
                        </div>
                    </div>
                </va-card-title>
                <va-card-content>
                    <va-chip v-for="(org,index) in treeStore.loadedSpecies" :key="index" icon="remove" @click="removeOrganism(org)" outline>
                        {{org.scientific_name}}
                    </va-chip> 
                </va-card-content>
            </va-card>
        </div>
    </div>
    <div class="row justify--end">
        <div class="flex">
            <va-button @click="getTree()" :disabled="treeStore.loadedSpecies.length < 1">generate tree</va-button>
        </div>
    </div>
    <div v-if="showTree" class="row">
        <TreeOfLife :data="treeData"/>
    </div>
</div>

</template>
<script setup>
import { computed, onMounted, watch, ref, reactive } from '@vue/runtime-core'
import {organisms} from '../stores/organisms'
import { tree } from '../stores/tree'
import OrganismFilter from '../components/OrganismFilter.vue';
import DataPortalService from '../services/DataPortalService';
import TreeOfLife from '../components/d3/TreeOfLife.vue';

const taxonInput = ref('')
const result = ref([])
const selectedRoot = ref({})
const selectAll = ref(false)
const orgStore = organisms()
const treeStore = tree()
const showTree=ref(false)
let treeData = null
onMounted(()=>{
    orgStore.loadOrganisms()
})

watch(taxonInput, ()=>{
    if(taxonInput.value.length>1){
        DataPortalService.searchTaxons({name: taxonInput.value})
        .then(resp => {
            result.value = resp.data
        })
        .catch(e => {
            isLoading.value=false
        })
    }
})
watch(selectedRoot, ()=>{
    orgStore.query.parent_taxid=selectedRoot.value.taxid
})
watch(orgStore.query, ()=>{
    orgStore.loadOrganisms()
},{deep:true})

const filteredOrganisms = computed(()=>{
    return orgStore.organisms.filter(org => !treeStore.loadedSpecies.some(el => el.taxid === org.taxid))
})

function addOrganism(organism){
    treeStore.loadedSpecies.push(organism)
    localStorage.setItem('loadedSpecies',treeStore.loadedSpecies)
}
function removeOrganism(organism){
    const index = treeStore.loadedSpecies.findIndex(spec => spec.taxid === organism.taxid)
    treeStore.loadedSpecies.splice(index,1)
    localStorage.setItem('loadedSpecies',treeStore.loadedSpecies)
}

function getTree(){
    showTree.value = false
    const taxids = treeStore.loadedSpecies.map(org => org.taxid)
    const root = selectedRoot.value.taxid
    DataPortalService.generateTree({taxids:taxids,root:root})
    .then(resp => {
        console.log(resp)
        treeData = resp.data
        showTree.value=true
    })
}


</script>
