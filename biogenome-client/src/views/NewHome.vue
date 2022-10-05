<template>
<div>
    <div class="row justify-space--between align--center custom-card">
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row custom-card">
                <div class="flex">
                    <h1 style="text-align:start" class="display-1">{{HomePage.title}}</h1>
                </div>
            </div>
            <div class="row custom-card">
                <div class="flex">
                    <p style="text-align:start">{{HomePage.description}}</p>
                </div>
            </div>
        </div>
    </div>
    <va-divider/>
    <div class="row align--center custom-card">
        <div class="scroller">
            <div v-for="(key,index) in Object.keys(stats.data)" :key="index" class="flex menu-item">
                <va-card class="custom-card box">
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                {{key}}
                            </div>
                            <div class="flex">
                                <va-icon 
                                    :name="dataIcons[key].icon"
                                    :color="dataIcons[key].color"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                        <strong>{{stats.data[key]}}</strong>
                    </va-card-content>
                </va-card>
            </div>
        </div>
    </div>
    <div class="row justify--space-between custom-card">
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row align--center justify--space-between custom-card">
                <div class="flex">
                    <h1 style="text-align:start" class="display-3">
                        {{`${selectedModelObj.text} Browser`}}
                    </h1>
                </div>
                <div class="flex">
                    <va-input
                        :placeholder="`Search in ${currentModel}`"
                        v-model="inputValue"
                    >
                        <template #appendInner>
                            <va-chip outline
                            :rounded="false"
                            :disabled="inputValue.length <= 1"
                            @click="search()"
                            icon="search"
                            >search</va-chip>
                        </template>
                    </va-input>
                </div>
                <div class="flex">
                    <va-button-toggle
                        size="small"
                        outline
                        :rounded="false"
                        v-model="currentModel"
                        :options="filteredModelOptions"
                    />
                </div>
            </div>
            <va-divider/>
            <div class="row custom-card">
                <div class="flex lg12 md12 sm12 xs12" style="max-height:50vh;overflow:scroll">
                    <NodeIterator v-for="(node, index) in treeStore.tree" :key="index" :node="node" :model="selectedModelObj"/>
                </div>
            </div>
        </div>
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row justify--space-between custom-card align--center custom-card">
                <div class="flex">
                    <va-select
                        label="taxonomic ranks"
                        v-model="rank"
                        :options="options"
                    >
                    </va-select>
                </div>
                <div class="flex">
                    <va-button-toggle
                        size="small"
                        outline
                        :rounded="false"
                        v-model="chart"
                        :options="chartOptions"
                    />
                </div>
            </div>
            <div v-if="showRanks" class="row custom-card">
                <div v-if="chart == 'chart'" class="flex lg12 md12 sm12 xs12" style="max-height:50vh;overflow:scroll">
                    <BarChart :data="stats.ranks"/>
                </div>
                <div v-else class="flex lg12 md12 sm12 xs12">
                    <PieChart :data="stats.ranks"/>
                </div>
            </div>
        </div>
    </div>
</div>
</template>
<script setup>

import {computed,onMounted,reactive,ref, watch} from 'vue'
import DataPortalService from '../services/DataPortalService';
import NodeIterator from '../components/NodeIterator.vue';
import { tree } from '../stores/tree';
import {dataIcons,HomePage} from '../../config.json'
import PieChart from '../components/d3/PieChart.vue';
import BarChart from '../components/d3/BarChart.vue';
import { useRouter } from 'vue-router';

const router = useRouter()
const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION
console.log(PROJECT_ACCESSION)
const stats = reactive({
    data:Object,
    organismsWithImages:Array,
    ranks:Array,
})
const chartOptions = [
    {value:'pie',icon:'pie_chart'},
    {value:'chart',icon:'bar_chart'},
]
const rank = ref('class')
const options = ['kingdom','phylum','class','order','family']
const treeStore = tree()
const modelOptions = [
    {
        text: 'Taxonomy',
        value: 'taxons', 
        icon: 'pets',
        searchQuery:DataPortalService.searchTaxons,
        defaultQuery:DataPortalService.getTaxonChildren,
        root: ROOTNODE,
        id: 'taxid'
    },
    {
        text: 'BioProjects',
        value: 'bioprojects',
        icon: 'science',
        searchQuery:DataPortalService.searchBioprojects,
        defaultQuery:DataPortalService.getBioProjectChildren,
        root: PROJECT_ACCESSION,
        id: 'accession'
    }
]
const isLoading = ref(false)
const chart = ref('pie')
const currentModel = ref('taxons')
const showTree = ref(false)
const showRanks = ref(false)
const showResult = ref(false)
const showOrganisms = ref(false)
const inputValue = ref('')

const filteredModelOptions = computed(()=>{
    if(PROJECT_ACCESSION){
        return modelOptions
    }
    return modelOptions.filter(opt => opt.value !== 'bioprojects')
})
const selectedModelObj = computed(()=>{
    return modelOptions.filter(opt => opt.value === currentModel.value)[0]
})

onMounted(()=>{
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
        const treeToLoad = resp.data
        treeToLoad.isOpen=true 
        treeStore.tree = [treeToLoad]
        showTree.value = true
        return DataPortalService.getStats()
    })
    .then(resp => {
        stats.data = {...resp.data}
        return DataPortalService.searchTaxons({rank:rank.value})
    })
    .then(resp => {
        stats.ranks = resp.data
        showRanks.value = true
        showOrganisms.value = true
    })
    .catch(e => {
        console.log(e)
    })
})

watch(rank,()=>{
    showRanks.value=false
    DataPortalService.searchTaxons({rank:rank.value})
    .then(resp => {
        stats.ranks = resp.data
        showRanks.value = true
    })
})

watch(inputValue, ()=>{
    if(inputValue.value.length<=1){
        selectedModelObj.value.defaultQuery(selectedModelObj.value.root)
        .then(resp => {
            const treeToLoad = resp.data
            treeToLoad.isOpen = true
            treeStore.tree = [treeToLoad]
            showTree.value = true
        })
    }
})

watch(currentModel, ()=>{
    isLoading.value=true
    showTree.value = false
    inputValue.value = ''
    const root = selectedModelObj.value.root
    selectedModelObj.value.defaultQuery(root).
    then(resp => {
        const treeToLoad = resp.data
        treeToLoad.isOpen = true
        treeStore.tree = [treeToLoad]
        showTree.value = true
        isLoading.value=false
    })
    .catch(e => {
        showTree.value = true
        isLoading.value=false
    })
})

function search(){
    selectedModelObj.value.searchQuery({name: inputValue.value})
    .then(resp => {
        treeStore.tree = resp.data
    })
    .catch(e => {
        console.log(e)
    })
}

function toRoute(node){
    router.push({name:selectedModelObj.value.value, params:{id:node[selectedModelObj.value.id]}})
}

</script>
<style scoped>
.scroller {
  overflow: auto;
  white-space: nowrap;
  display: block;
}
.result-list{
    position: absolute;
    background-color: white;
    z-index: 100;
    width: 100%;
}
.result-list{
    cursor: pointer;
}
.result-item:hover{
    background-color: #eff3f8;
}
.menu-item {
  display: inline-block;
  text-align: center;
  text-decoration: none;
}
</style>