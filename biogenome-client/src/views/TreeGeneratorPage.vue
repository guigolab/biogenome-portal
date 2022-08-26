<template>
<div>
    <div class="row justify--space-between align--center">
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
        <div class="flex">
            <va-chip v-if="selectedRoot.taxid" color="secondary" outline icon="close" @click="selectedRoot={};showTree=false">{{selectedRoot.name}}</va-chip>
            <va-chip v-if="selectedBioProject.title" color="secondary" outline icon="close" @click="selectedBioProject={};bioprojectSkipped=false">{{selectedBioProject.title || 'None'}}</va-chip>
        </div>
    </div>
    <va-divider/>
    <Transition name="slide-fade">
        <div v-if="!selectedRoot.taxid">
            <div class="row align--center justify--space-between">
                <div class="flex lg6 md6 sm12 xs12">
                    <div class="row align--center justify--center custom-card">
                        <div class="flex">
                            <h1 style="text-align:start" class="display-5">1. Select a BioProject (Optional)</h1>
                        </div>
                    </div>
                    <div class="row justify--center custom-card">
                        <div class="flex">
                            <va-card @mouseenter="showBioProjectResult=true" @mouseleave="showBioProjectResult=false" class="custom-card">
                                <va-card-title>
                                    <va-input label="search bioproject"
                                        placeholder="ex. Earth BioGenome Project (EBP)"
                                        v-model="bioProjectInput"
                                    />
                                </va-card-title>
                                <va-card-content v-if="showBioProjectResult && bioprojectResult.length" class="result-content">
                                    <ul>
                                        <li @click="selectedBioProject=project" v-for="(project,index) in bioprojectResult" :key="index">
                                            <div style="padding:15px" class="row justify--space-between result-element">
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
                <div class="flex lg6 md6 sm12 xs12">
                    <div class="row align--center justify--center custom-card">
                        <div class="flex">
                            <h1 style="text-align:start" class="display-5">2. Select a root node (Mandatory)</h1>
                        </div>
                    </div>
                    <div class="row justify--center custom-card">
                        <div class="flex">
                            <va-card @mouseenter="showTaxonResult=true" @mouseleave="showTaxonResult=false" class="custom-card">
                                <va-card-title>
                                    <va-input 
                                        label="search taxon"
                                        placeholder="ex. Aves"
                                        v-model="taxonInput"
                                    />
                                </va-card-title>
                                <va-card-content v-if="showTaxonResult && taxonResult.length" class="result-content">
                                    <ul>
                                        <li @click="selectedRoot=taxon" v-for="(taxon,index) in taxonResult" :key="index">
                                            <div style="padding:15px" class="row justify--space-between result-element">
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
            </div>
        </div>
    </Transition>
    <Transition name="slide-fade">
        <div v-if="selectedRoot.taxid && !showTree">
            <div class="row justify--center align--center custom-card">
                <div class="flex">
                    <h1 style="text-align:start" class="display-5">3. Add up to 150 organisms</h1>
                </div>
            </div>
            <div class="row justify--space-between">
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
                                    <va-button :disabled="orgStore.total+treeStore.loadedSpecies.length >= treeStore.limit" @click="loadAll()" size="small" outline>select all</va-button>
                                </div>
                            </div>
                        </va-card-title>
                        <va-card-content>
                            <OrganismFilter/>
                        </va-card-content>
                        <va-card-content style="max-height:30vh;overflow:scroll">
                            <ul>
                                <li @click="addOrganism(org)" v-for="(org,index) in filteredOrganisms()" :key="index">
                                    <div style="padding:15px" class="row justify--space-between result-element">
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
                                    <va-button :disabled="treeStore.loadedSpecies.length === 0" @click="treeStore.loadedSpecies = []" size="small" outline>remove all</va-button>
                                </div>
                            </div>
                        </va-card-title>
                        <va-card-content style="max-height:30vh;overflow:scroll;">
                            <ul>
                                <li @click="removeOrganism(org)" v-for="(org,index) in treeStore.loadedSpecies" :key="index">
                                    <div style="padding:15px" class="row justify--space-between result-element">
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
                    <va-button icon="insights" color="secondary" @click="getTree()" :disabled="!isTreeValid">Create Tree</va-button>
                </div>
            </div>
        </div>
    </Transition>
    <Transition name="slide-fade">
        <div v-if="showTree" class="row">
            <TreeOfLife :data="treeData"/>
        </div>
    </Transition>
</div>

</template>
<script setup>
import { computed, onMounted, watch, ref, reactive } from '@vue/runtime-core'
import {organisms} from '../stores/organisms'
import { tree } from '../stores/tree'
import OrganismFilter from '../components/OrganismFilter.vue';
import DataPortalService from '../services/DataPortalService';
import TreeOfLife from '../components/d3/TreeOfLife.vue';

const bioprojectSkipped = ref(false)
const taxonInput = ref('')
const bioProjectInput = ref('')
const taxonResult = ref([])
const bioprojectResult = ref([])
const showTaxonResult = ref(false)
const showBioProjectResult = ref(false)
const selectedRoot = ref({})
const selectedBioProject = ref({})
const selectAll = ref(false)
const orgStore = organisms()
const treeStore = tree()
const showTree=ref(false)
let treeData = null

onMounted(()=>{
    Object.keys(orgStore.query).forEach(key => {
        if(key !== 'limit' || key !== 'offset'){
            orgStore.query[key] = null
        }
    })
})

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

function loadAll(){
    if(orgStore.total > 0){
        const total = orgStore.total
        orgStore.query.limit = total
        DataPortalService.getOrganisms(orgStore.query)
        .then(resp => {
            orgStore.organisms = [...resp.data.data]
            const totalSpecies = treeStore.loadedSpecies.concat(filteredOrganisms())
            treeStore.loadedSpecies = [...totalSpecies]
        })
    }
}

function addOrganism(organism){
    treeStore.loadedSpecies.push(organism)
    if(orgStore.query.offset + orgStore.query.limit <= orgStore.total && filteredOrganisms().length === 0){
        orgStore.query.offset = orgStore.query.offset + orgStore.query.limit
        orgStore.loadOrganisms()
    }
}
function removeOrganism(organism){
    const index = treeStore.loadedSpecies.findIndex(spec => spec.taxid === organism.taxid)
    treeStore.loadedSpecies.splice(index,1)
}

function getTree(){
    showTree.value = false
    const taxids = treeStore.loadedSpecies.map(org => org.taxid)
    const root = selectedRoot.value.taxid
    DataPortalService.generateTree({taxids:taxids,root:root})
    .then(resp => {
        treeData = resp.data
        showTree.value=true
    })
}


</script>
<style scoped>
.result-content{
    max-height: 35vh;
    overflow: scroll;
    position: absolute;
    z-index: 1000;
    background-color: white;
}
.result-element:hover{
    background-color: #eff3f8;
}
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
</style>