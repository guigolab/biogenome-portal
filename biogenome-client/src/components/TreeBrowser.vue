<template>
<ul class="tree-container">
    <li v-for="child in children" :key="child.taxid">
        <div @click="toggle(child)" class="child-container row justify--space-between align--center">
            <div v-if="child.children && child.children.length" class="flex lg1 md1">
                <va-icon color="gray" :name="child.isOpen? 'expand_less':'expand_more'"/>
            </div>
            <div class="flex lg10 md10">
                <div class="row align--center justify--start">
                    <div class="flex">
                        <a class="link">{{child.name}}</a>
                    </div>
                    <div class="flex">
                        <p class="text--secondary">{{'('+child.rank+')'}}</p>
                    </div>
                </div>
            </div>
            <div class="flex lg1 md1">
                <va-badge @click.stop.prevent="updateOrganisms(child)" color="success" :text="child.leaves"/>
            </div>
        </div>
        <Transition name="slide-fade">
            <TreeBrowser
                v-show="child.isOpen" v-if="child.children && child.children.length"
                class="item"
                :key="index"
                :children="child.children"
            />
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
    children:Object
})

function toggle(item){
    if(!item.isOpen){
        if(!item.children.filter(ch => ch && ch.name).length){
            DataPortalService.getTaxonChildren(item.taxid)
            .then(resp => {
                nextTick(()=>{
                    item.children = resp.data
                })
            })
        }
    }
    item.isOpen = !item.isOpen
}

function updateOrganisms(node){
    orgStore.query.taxid = node.taxid
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