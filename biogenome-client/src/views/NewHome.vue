<template>
    <div>
        <div class="row justify--center">
            <div v-for="(key,index) in Object.keys(stats.data)" :key="index" class="flex lg2 md2 sm4 xs4">
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
        <div v-if="stats.organismsWithImages.length" class="row">
            <div v-for="(org,index) in stats.organismsWithImages" size="large" :key="index" class="flex">
                <va-card class="custom-card">
                    <va-image :src="org.image"></va-image>
                    <va-card-content>
                        <va-chip size="small" outline>{{org.scientific_name}}</va-chip>
                    </va-card-content>
                </va-card>
            </div>
        </div>
        <div class="row">
            <div class="flex lg6 md6 sm12 xs12">
                <va-inner-loading :loading="isLoading">
                    <va-card class="custom-card">
                        <va-card-title>
                            <div class="row justify--space-between align--center">
                                <div class="flex">
                                <va-input
                                    :label="currentModel"
                                    placeholder="Search"
                                    v-model="inputValue"
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
                        </va-card-title>
                        <va-card-content style="max-height:50vh;overflow:scroll" v-if="showTree">
                            <NodeIterator v-for="(node, index) in treeStore.tree" :key="index" :node="node" :model="selectedModelObj"/>
                        </va-card-content>
                    </va-card>
                </va-inner-loading>
            </div>
            <div v-if="showOrganisms" class="flex lg6 md6 sm12 xs12">
                <va-card class="custom-card">
                    <va-card-title>
                        recent organisms
                    </va-card-title>
                    <va-card-content style="max-height:50vh;overflow:scroll">
                        <va-list style="padding-top:0!important">
                            <va-list-item
                                v-for="(organism, index) in stats.lastCreated"
                                :key="index"
                            >
                            <va-list-item-section avatar>
                                <va-avatar size="large">
                                    <img :src="organism.image">
                                </va-avatar>
                            </va-list-item-section>

                            <va-list-item-section style="text-align:start">
                                <va-list-item-label>
                                {{ organism.scientific_name}}
                                </va-list-item-label>

                                <va-list-item-label caption>
                                {{ organism.insdc_common_name? organism.insdc_common_name+', '+organism.tolid_prefix:organism.tolid_prefix }}
                                </va-list-item-label>
                            </va-list-item-section>

                            <va-list-item-section icon>
                                <va-icon style="padding:5px" v-for="dt in mapData(organism)" :key="dt"
                                    :name="dataIcons[dt].icon"
                                    :color="dataIcons[dt].color"
                                />
                            </va-list-item-section>
                            </va-list-item>
                        </va-list>
                    </va-card-content>
                </va-card>
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
import {dataIcons} from '../../config.json'

const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION
const stats = reactive({
    data:Object,
    organismsWithImages:Array,
    lastCreated:Array
})
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
        return DataPortalService.getOrganisms({image:true})
    })
    .then(resp => {
        stats.organismsWithImages = [...resp.data.data]
        return DataPortalService.getOrganisms({last_created:true})
    })
    .then(resp => {
        stats.lastCreated = resp.data.data
        showOrganisms.value = true
    })
    .catch(e => {
        console.log(e)
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

function mapData(item){
    return Object.keys(item).filter(k => ['local_samples','biosamples','assemblies','experiments','annotations'].includes(k))
    .filter(key => item[key].length)
}
</script>