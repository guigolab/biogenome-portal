<template>
<div>
    <div class="row justify--space-between align--center">
        <div class="flex lg6 md6 sm12 xs12">
            <div class="row custom-card">
                <div class="flex">
                    <h1 style="text-align:start" class="display-3">Tree of Life</h1>
                </div>
            </div>
            <div class="row custom-card">
                <div class="flex">
                    <va-chip @click="showForm=true;showTree=false" outline>Generate Tree</va-chip>
                </div>
                <div class="flex">
                    <va-chip @click="showForm=false;showTree=true" outline>Browse Tree</va-chip>
                </div>
            </div>
        </div>
    </div>
    <va-divider/>
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
import { onMounted, watch, ref } from '@vue/runtime-core'
import DataPortalService from '../services/DataPortalService';
import TreeOfLife from '../components/d3/TreeOfLife.vue';
import TreeFilter from '../components/TreeFilter.vue';

const props = defineProps({
    taxid:String
})

const showTree=ref(false)
const showForm=ref(false)
let treeData = null


onMounted(()=>{
    browseTree(props.taxid)
})

watch(()=>props.taxid,()=>{
    browseTree(props.taxid)
})
 

function browseTree(taxid){
    showTree.value=false
    DataPortalService.getTree(taxid)
    .then(resp => {
        treeData = resp.data
        showTree.value = true
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