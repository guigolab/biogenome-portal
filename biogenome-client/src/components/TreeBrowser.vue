<template>
<ul class="tree-container" :id="node.name">
    <li>
        <div @click="toggle(node)" class="child-container row justify--space-between align--center">
            <div class="flex">
                <div class="row justify--start align--center">
                    <div v-if="node.children && node.children.length" class="flex">
                        <va-icon color="gray" :name="node.isOpen? 'expand_less':'expand_more'"/>
                    </div>
                    <div class="flex">
                        <a class="link">{{node.name}}</a>
                    </div>
                    <div class="flex">
                        <p class="text--secondary">{{'('+node.rank+')'}}</p>
                    </div>
                </div>
            </div>
            <div class="flex">
                <div class="row justify--end align--center">
                    <div class="flex">
                        <va-icon
                            name="pattern"
                            color="gray"
                        />
                    </div>
                    <div class="flex">
                        <va-icon
                            name="radio_button_checked"
                            @click.stop.prevent="updateOrganisms(node)"
                            :color="taxStore.taxonNav[taxStore.taxonNav.length-1].taxid === node.taxid?'primary':'gray'"
                        />
                    </div>
                </div>
            </div>
        </div>
        <Transition name="slide-fade">
            <ul v-if="node.children && node.children.length && node.isOpen">
                <TreeBrowser
                    v-for="(child, index) in node.children"
                    class="node"
                    :key="index"
                    :node="child"
                />
            </ul>
        </Transition>
    </li>
</ul>
</template>
<script setup>
import TreeBrowser from './TreeBrowser.vue';
import { computed, onMounted, ref, nextTick } from 'vue';
import DataPortalService from '../services/DataPortalService'
import {organisms} from '../stores/organisms'
import {taxons} from '../stores/taxons'

const taxStore = taxons()
const orgStore = organisms()

const props = defineProps({
    node:Object
})

function toggle(node){
    if(!node.isOpen){
        if(!node.children.filter(ch => ch && ch.name).length){
            DataPortalService.getTaxonChildren(node.taxid)
            .then(resp => {
                nextTick(()=>{
                    node.children = resp.data.children
                })
            })
        }
    }
    node.isOpen = !node.isOpen
}

function updateOrganisms(node){
    orgStore.query.parent_taxid = node.taxid
    if(!taxStore.taxonNav.filter(el => el.taxid === node.taxid).length){
        taxStore.taxonNav.push(node)
    }
    DataPortalService.getTaxonChildren(node.taxid)
    .then(response => {
        nextTick(()=>{
            taxStore.tree = response.data
        })
    })

}

</script>
<style scoped>
ul{
  padding-left:0.33rem !important;
}
.child-container:hover{
  background-color: #eff3f8;
}
.child-container{
    cursor: pointer;
    padding: 10px;
}
.slide-fade-enter-active {
  transition: all .2s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}
.slide-fade-leave-active {
  transition: all .2s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}
.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(10px);
  opacity: 0;
}
</style>