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
        <!-- <div class="flex">
            <va-button-toggle
                size="small"
                outline
                :rounded="false"
                v-model="currentModel"
                :options="modelOptions"
            />
        </div> -->
    </div>
    <va-divider/>
    <div v-if="showSlider" class="row justify--center">
        <div class="flex lg8 md10 sm12 xs12">
            <va-slider
                v-model="treeSize"
                track-label-visible
                :max="maxLevel"
            >
                <template #trackLabel="{ value }">
                    <va-chip outline color="secondary" size="small">{{ levels[value] }}</va-chip>
                </template>
            </va-slider>
        </div>
    </div>
    <Transition name="slide-fade">
        <div v-if="showForm">
            <TreeFilter @generate-tree="getTree"/>
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
import { tree } from '../stores/tree'
import DataPortalService from '../services/DataPortalService';
import TreeOfLife from '../components/d3/TreeOfLife.vue';
import TreeFilter from '../components/TreeFilter.vue';
import * as d3 from "d3";

const props = defineProps({
    taxid:String
})

const ROOTNODE = import.meta.env.VITE_ROOT_NODE

const currentModel = ref('default')
const isLoading = ref(false)
const showTree=ref(false)
const showForm=ref(true)
const showSlider = ref(false)
const treeSize = ref(0)
const maxLevel = ref(0)
let treeData = null
const modelOptions = [
    {value:'default', icon:'insights'},
    {value:'custom', icon:'inbox_customize'}
]
const levels = ref({})

onMounted(()=>{
    getTreeAndLevels(props.taxid)
})

watch(props.taxid,()=>{
    // getTreeAndLevels(props.taxid)
})
 
function getTreeAndLevels(taxid){
     DataPortalService.getTree(taxid)
     .then(resp => {
         const root = d3.hierarchy(resp.data , d => d.children)
        .sum(d => d.children ? 0 : 1)
        .sort((a, b) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length));
        console.log(root)
        if(root.leaves() > 250){

        }
     })
}

function getTree(payload){
    showTree.value = false
    const taxids = payload.data.map(org => org.taxid)
    DataPortalService.generateTree({taxids:taxids,root:payload.root.taxid})
    .then(resp => {
        treeData = resp.data
        showForm.value=false
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