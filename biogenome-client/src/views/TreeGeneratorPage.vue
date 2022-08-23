<template>
<div>
    <div class="row justify-space--between align--center">
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row custom-card">
                <div class="flex">
                    <h1 style="text-align:start" class="display-3">Tree of Life Generator</h1>
                </div>
            </div>
            <div class="row custom-card">
                <div class="flex">
                    <p style="text-align:start">Generate a Tree of Life image and download it</p>
                </div>
            </div>
        </div>
    </div>
    <va-divider/>
    <div class="row justify--space-between">
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row align--center custom-card">
                <div class="flex">
                    <h1 style="text-align:start" class="display-5">1. Select a root node</h1>
                </div>
                <div v-if="Object.keys(selectedRoot).length" class="flex">
                    <va-chip outline icon="close" @click="selectedRoot={}">{{selectedRoot.name}}</va-chip>
                </div>
            </div>
            <div v-if="!Object.keys(selectedRoot).length" class="row">
                <div class="flex">
                    <va-card class="custom-card">
                        <va-card-title>
                            <va-input 
                                label="search taxon"
                                placeholder="ex. Aves"
                                v-model="taxonInput"
                            />
                        </va-card-title>
                        <va-card-content style="max-height:30vh;overflow: scroll;">
                            <ul>
                                <li @click="selectedRoot=taxon" v-for="(taxon,index) in taxonResult" :key="index">
                                    <div style="padding:15px" class="row justify--space-between">
                                        <div class="flex">
                                            <strong>{{taxon.name}}</strong>
                                        </div>
                                        <div class="flex">
                                            <p class="text--secondary">{{taxon.taxid}}</p>
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </va-card-content>
                    </va-card>
                </div>
            </div>
        </div>
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row align--center custom-card">
                <div class="flex">
                    <h1 style="text-align:start" class="display-5">1.1 Select a BioProject (Optional)</h1>
                </div>
                <div v-if="Object.keys(selectedBioProject).length" class="flex">
                    <va-chip outline icon="close" @click="selectedBioProject={}">{{selectedBioProject.title}}</va-chip>
                </div>
            </div>
            <div v-if="!Object.keys(selectedBioProject).length" class="row">
                <div class="flex">
                    <va-card class="custom-card">
                        <va-card-title>
                            <va-input label="search bioproject"
                                placeholder="ex. Earth BioGenome Project (EBP)"
                                v-model="bioProjectInput"
                            />
                        </va-card-title>
                        <va-card-content style="max-height:30vh;overflow: scroll;">
                            <ul>
                                <li @click="selectedBioProject=project" v-for="(project,index) in bioprojectResult" :key="index">
                                    <div style="padding:15px" class="row justify--space-between">
                                        <div class="flex">
                                            <strong>{{project.title}}</strong>
                                        </div>
                                        <div class="flex">
                                            <p class="text--secondary">{{project.accession}}</p>
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </va-card-content>
                    </va-card>
                </div>
            </div>       
        </div>
    </div>
    <div class="row justify--space-between align--center custom-card">
        <div class="flex">
            <h1 style="text-align:start" class="display-5">2. Add up to 150 organisms</h1>
        </div>
    </div>
    <div v-if="Object.keys(selectedRoot).length" class="row justify--space-between">
        <div class="flex lg5 md5 sm12 xs12">
            <va-card class="custom-card">
                <va-card-title>
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            organisms
                        </div>
                        <div style="padding:5px" class="flex">
                            {{orgStore.total}}
                        </div>
                        <div class="flex">
                            <va-chip :disabled="orgStore.total+treeStore.loadedSpecies.length >= treeStore.limit" @click="loadAll()" size="small" outline>select all</va-chip>
                        </div>
                    </div>
                </va-card-title>
                <va-card-content>
                    <OrganismFilter/>
                </va-card-content>
                <va-card-content style="max-height:30vh;overflow:scroll">
                    <ul>
                        <li @click="addOrganism(org)" v-for="(org,index) in filteredOrganisms()" :key="index">
                            <div style="padding:15px" class="row justify--space-between">
                                <div class="flex">
                                    <strong>{{org.scientific_name}}</strong>
                                </div>
                                <div class="flex">
                                    <p class="text--secondary">{{org.taxid}}</p>
                                </div>
                            </div>
                        </li>
                    </ul>
                </va-card-content>
            </va-card>
        </div>
        <div class="flex lg5 md5 sm12 xs12">
            <va-card class="custom-card">
                <va-card-title>
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <div class="row justify--space-between align--center">
                                <div class="flex">
                                    selected organisms
                                </div>
                                <div style="padding:5px" class="flex">
                                    {{`${treeStore.loadedSpecies.length}/${treeStore.limit}`}}
                                </div>
                            </div>
                        </div>
                        <div class="flex">
                            <va-chip :disabled="treeStore.loadedSpecies.length === 0" @click="treeStore.loadedSpecies = []" size="small" outline>remove all</va-chip>
                        </div>
                    </div>
                </va-card-title>
                <va-card-content style="max-height:30vh;overflow:scroll;">
                    <ul>
                        <li @click="removeOrganism(org)" v-for="(org,index) in treeStore.loadedSpecies" :key="index">
                            <div style="padding:15px" class="row justify--space-between">
                                <div class="flex">
                                    <strong>{{org.scientific_name}}</strong>
                                </div>
                                <div class="flex">
                                    <p class="text--secondary">{{org.taxid}}</p>
                                </div>
                            </div>
                        </li>
                    </ul>
                </va-card-content>
            </va-card>
        </div>
    </div>
    <div class="row justify--center">
        <div class="flex">
            <va-button size="large" outline @click="getTree()" :disabled="!isTreeValid">generate tree</va-button>
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

const steps = reactive({
    rootSelected:false,
    speciesSelected:false
})
const taxonInput = ref('')
const bioProjectInput = ref('')
const taxonResult = ref([])
const bioprojectResult = ref([])

const selectedRoot = ref({})
const selectedBioProject = ref({})
const selectAll = ref(false)
const orgStore = organisms()
const treeStore = tree()
const showTree=ref(false)
let treeData = null

// onMounted(()=>{
//     orgStore.loadOrganisms()
// })

watch(taxonInput, ()=>{
    if(taxonInput.value.length>1){
        DataPortalService.searchTaxons({name: taxonInput.value})
        .then(resp => {
            taxonResult.value = resp.data
        })
        .catch(e => {
            console.log(e)
        })
    }else{
        taxonResult.value=[]
    }
})
watch(bioProjectInput, ()=>{
    if(bioProjectInput.value.length>1){
        DataPortalService.searchBioprojects({name: bioProjectInput.value})
        .then(resp => {
            bioprojectResult.value = resp.data
        })
        .catch(e => {
            console.log(e)
        })
    }else{
        bioprojectResult.value=[]
    }
})
watch(selectedRoot, ()=>{
    orgStore.query.parent_taxid=selectedRoot.value.taxid
})
watch(selectedBioProject, ()=>{
    orgStore.query.bioproject=selectedBioProject.value.accession
})

watch(orgStore.query, ()=>{
    orgStore.loadOrganisms()
},{deep:true})

const isTreeValid = computed(()=>{
    return treeStore.loadedSpecies.length > 0 && treeStore.loadedSpecies.length <= 150 && selectedRoot.value.taxid
})
function filteredOrganisms(){
    return orgStore.organisms.filter(org => !treeStore.loadedSpecies.some(el => el.taxid === org.taxid))
}
// const filteredOrganisms = computed(()=>{
//     return orgStore.organisms.filter(org => !treeStore.loadedSpecies.some(el => el.taxid === org.taxid))
// })

function loadAll(){
    const total = orgStore.total
    orgStore.query.limit = total
    DataPortalService.getOrganisms(orgStore.query)
    .then(resp => {
        orgStore.organisms = [...resp.data.data]
        const totalSpecies = treeStore.loadedSpecies.concat(filteredOrganisms())
        treeStore.loadedSpecies = [...totalSpecies]
    })
}

function addOrganism(organism){
    treeStore.loadedSpecies.push(organism)
    if(orgStore.query.offset + orgStore.query.limit <= orgStore.total && filteredOrganisms().length === 0){
        orgStore.query.offset = orgStore.query.offset + orgStore.query.limit
        orgStore.loadOrganisms()
    }
    // localStorage.setItem('loadedSpecies',treeStore.loadedSpecies)
}
function removeOrganism(organism){
    const index = treeStore.loadedSpecies.findIndex(spec => spec.taxid === organism.taxid)
    treeStore.loadedSpecies.splice(index,1)
    // localStorage.setItem('loadedSpecies',treeStore.loadedSpecies)
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
