<template>
<div>
    <div class="row justify-space--between align--center">
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row custom-card">
                <div class="flex">
                    <h1 class="display-3">{{HomePage.title}}</h1>
                </div>
            </div>
            <div class="row custom-card">
                <div class="flex">
                    <p style="text-align:start">{{HomePage.description}}</p>
                </div>
            </div>
        </div>
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row align--center justify--end">
                <div class="scroller">
                    <div v-for="(key,index) in Object.keys(stats.data)" :key="index" class="flex menu-item">
                        <va-card  class="custom-card box">
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
        </div>
    </div>
    <va-divider/>
    <div class="row justify--space--between">
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row justify--space-between custom-card align--center">
                <div class="flex lg8 md8 sm12 xs12">
                    <va-input
                        :label="currentModel"
                        placeholder="Search"
                        v-model="inputValue"
                        outline
                    />
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
            <div class="row">
                <div style="max-height:50vh;overflow:scroll" class="flex lg12 md12 sm12 xs12">
                    <NodeIterator v-for="(node, index) in treeStore.tree" :key="index" :node="node" :model="selectedModelObj"/>
                </div>
            </div>
        </div>
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row justify--space-between custom-card align--center">
                <div class="flex lg12 md12 sm12 xs12">
                    <va-select
                        label="taxonomic ranks"
                        v-model="rank"
                        :options="options"
                    >
                    </va-select>
                </div>
            </div>
            <div class="row">
                <div v-if="showRanks" style="max-height:50vh;overflow:scroll" class="flex lg12 md12 sm12 xs12">
                    <BarChart :data="stats.ranks"/>
                    <PieChart :data="stats.ranks"/>
                    <!-- <NodeIterator v-for="(node, index) in stats.ranks" :key="index" :node="node" :model="modelOptions[0]"/> -->
                </div>
            </div>
        </div>
    </div>
</div>
</template>
<script setup>

import {computed,onMounted,reactive,ref, watch} from 'vue'
import { organisms } from '../stores/organisms';
import DataPortalService from '../services/DataPortalService';
import NodeIterator from '../components/NodeIterator.vue';
import { tree } from '../stores/tree';
import {dataIcons,TwitterURL,HomePage} from '../../config.json'
import TwitterWidget from '../components/TwitterWidget.vue';
import ICicle from '../components/d3/ICicle.vue';
import PieChart from '../components/d3/PieChart.vue';
import BarChart from '../components/d3/BarChart.vue';


const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION
const stats = reactive({
    data:Object,
    organismsWithImages:Array,
    ranks:Array,
    icicle:Object
})
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
const orgStore = organisms()
const currentModel = ref('taxons')
const showTree = ref(false)
const showRanks = ref(false)
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
        treeStore.tree = [resp.data]
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
    if(inputValue.value.length>1){
        isLoading.value = true
        selectedModelObj.value.searchQuery({name: inputValue.value})
        .then(resp => {
            treeStore.tree = resp.data
            isLoading.value=false
        })
        .catch(e => {
            isLoading.value=false
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
        treeStore.tree = [resp.data]
        showTree.value = true
        isLoading.value=false
    })
    .catch(e => {
        showTree.value = true
        isLoading.value=false
    })
})

</script>
<style scoped>
.scroller {
  overflow: auto;
  white-space: nowrap;
  display: block;
}

.menu-item {
  display: inline-block;
  text-align: center;
  text-decoration: none;
}
</style>