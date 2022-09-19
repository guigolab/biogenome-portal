<template>
    <div>
        <div class="row align--center justify--space-between">
            <div class="flex lg6 md6 sm12 xs12">
                <va-card v-if="!selectedProject.accession" class="custom-card box">
                    <va-card-title> bioproject selection </va-card-title>
                    <va-card-content>
                        <va-input 
                            label="search bioproject" 
                            placeholder="ex. Earth BioGenome Project (EBP)" 
                            v-model="projectInput"
                            :disabled="selectedRoot.taxid"
                        />
                    </va-card-content>
                    <va-card-content v-if="showProjectResult" class="result-content">
                        <ul>
                            <li @click="onProjectSelection(project)" v-for="(project,index) in projectResult" :key="index">
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
                <va-card v-else class="custom-card box">
                    <va-card-content>
                        <va-chip icon="close" outline @click="onProjectUnselect()">{{selectedProject.title}}</va-chip> 
                    </va-card-content>
                </va-card>
            </div>
            <div class="flex lg6 md6 sm12 xs12">
                <va-card v-if="!selectedRoot.taxid" class="custom-card box">
                    <va-card-title>taxon root selection</va-card-title>
                    <va-card-content>
                        <va-input 
                            label="search taxon" 
                            v-model="taxonInput"
                            placeholder="ex. Eukaryota"
                            :error="!selectedRoot.taxid"
                        />
                    </va-card-content>
                    <va-card-content v-if="showTaxonResult" class="result-content">
                        <ul>
                            <li @click="onRootSelection(taxon)" v-for="(taxon,index) in taxonResult" :key="index">
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
                <va-card v-else class="custom-card box">
                    <va-card-content>
                       <va-chip icon="close" outline @click="onRootUnselect()">{{selectedRoot.name}}</va-chip>
                    </va-card-content>
                </va-card>
            </div>
        </div>
        <Transition name="slide-fade">
            <div v-if="selectedRoot.taxid" class="row justify--space-between">
                <div class="flex lg6 md6 sm12 xs12">
                    <va-card class="custom-card box">
                        <va-card-title>
                            <div class="row justify--space-between">
                                <div class="flex">
                                    organisms
                                </div>
                                <div class="flex">
                                    {{organisms.data.length}}
                                </div>
                            </div>
                        </va-card-title>
                        <va-card-content>
                            <div class="row justify--space-between">
                                <div class="flex">
                                    <va-input placeholder="search" v-model="organismsInput"></va-input>
                                </div>
                                <div class="flex">
                                    <va-button outline @click="addAll()" :disabled="(loadedSpecies.data.length + organisms.data.length) > limit" :rounded="false" size="small">select all</va-button>
                                </div>
                            </div>
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
                <div class="flex lg6 md6 sm12 xs12">
                    <va-card class="custom-card box">
                        <va-card-title>
                            <div class="row justify--space-between">
                                <div class="flex">
                                    selected organisms
                                </div>
                                <div class="flex">
                                    {{`${loadedSpecies.data.length}/${limit}`}}
                                </div>
                            </div>
                        </va-card-title>
                        <va-card-content>
                            <div class="row justify--space-between">
                                <div class="flex">
                                    <va-input placeholder="search" v-model="loadedSpeciesInput"></va-input>
                                </div>
                                <div class="flex">
                                    <va-button outline :disabled="loadedSpecies.data.length === 0" @click="removeAll()" :rounded="false" size="small">remove all</va-button>
                                </div>
                            </div>
                        </va-card-content>
                        <va-card-content style="max-height:30vh;overflow:scroll;">
                            <ul>
                                <li @click="removeOrganism(org)" v-for="(org,index) in loadedSpecies.data" :key="index">
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
        </Transition>
        <div class="row justify--center">
            <div class="flex">
                <va-button icon="insights" color="secondary" @click="$emit('generateTree',{data:loadedSpecies.data,root:selectedRoot})" :disabled="!isTreeValid">Create Tree</va-button>
            </div>
        </div>
    </div>
</template>
<script setup>
import { reactive,ref,watch,computed,defineEmits } from 'vue';
import DataPortalService from '../services/DataPortalService';
import { tree } from '../stores/tree';

const query = reactive({
    parent_taxid:'',
    limit: 20,
    offset:0,
    bioproject:''
})

const emits = defineEmits(['generateTree'])
const limit = 150
const total = ref(0)
const selectedProject = ref({})
const selectedRoot = ref({})
const taxonInput = ref('')
const projectInput = ref('')
const showTaxonResult = ref(false)
const showProjectResult = ref(false)
const organisms = reactive({
    data:[]
    })
const loadedSpecies = reactive({
    data:[]
    })
let taxonResult = []
let projectResult = []

watch(taxonInput, ()=>{
    showTaxonResult.value=false
    if(taxonInput.value.length>1){
        DataPortalService.searchTaxons({name: taxonInput.value})
        .then(resp => {
            taxonResult = resp.data
            showTaxonResult.value=true
        })
        .catch(e => {
            console.log(e)
        })
    }else{
        taxonResult=[]
    }
})
watch(projectInput, ()=>{
    showProjectResult.value=false
    if(projectInput.value.length>1){
        DataPortalService.searchBioprojects({name: projectInput.value})
        .then(resp => {
            projectResult = resp.data
            showProjectResult.value=true
        })
        .catch(e => {
            console.log(e)
        })
    }else{
        showProjectResult.value=false
        projectResult=[]
    }
})
const isTreeValid = computed(()=>{
    return loadedSpecies.data.length > 0 && loadedSpecies.data.length <= 150 && selectedRoot.value.taxid
})
function filteredOrganisms(){
    return organisms.data.filter(org => !loadedSpecies.data.some(el => el.taxid === org.taxid))
}
function onRootSelection(taxon){
    query.parent_taxid = taxon.taxid
    DataPortalService.getOrganisms(query)
    .then(resp => {
        total.value = resp.data.total
        query.limit = total.value
        return DataPortalService.getOrganisms(query)
    })
    .then(resp => {
        organisms.data = [...resp.data.data]
        selectedRoot.value = taxon
    })
}
function onRootUnselect(){
    query.parent_taxid = ''
    selectedRoot.value = {}
}
function onProjectSelection(project){
    query.bioproject = project.accession
    if(query.parent_taxid){
        DataPortalService.getOrganisms(query)
        .then(resp => {
            total.value = resp.data.total
            query.limit = total.value
            return DataPortalService.getOrganisms(query)
        })
        .then(resp => {
            organisms.data = [...resp.data.data]
            selectedProject.value = project
        })
    }else{
        selectedProject.value = project
    }
}
function onProjectUnselect(){
    query.bioproject = ''
    selectedProject.value = {}
}
function addOrganism(organism){
    if(loadedSpecies.data.length+1 <= limit){
        loadedSpecies.data.push(organism)
    }
}
function removeOrganism(organism){
    const index = loadedSpecies.data.findIndex(spec => spec.taxid === organism.taxid)
    loadedSpecies.data.splice(index,1)
}
function addAll(){
    loadedSpecies.data = [...loadedSpecies.data.concat(organisms.data)]
}
function removeAll(){
    loadedSpecies.data = []
}
</script>
<style scoped>
.result-content{
    max-height: 35vh;
    overflow: scroll;
    width: 100%;
    position: absolute;
    z-index: 1000;
    background-color: white;
}
.result-element:hover{
    background-color: #eff3f8;
}
</style>