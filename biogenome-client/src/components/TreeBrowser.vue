<template>
<li :class="orgStore.selectedNode.name === node.name?'tree-container'+' '+'selected':'tree-container'" :id="node.name">
    <div @click="toggle(node)" class="child-container row justify--space-between align--center">
        <div class="flex">
            <va-icon color="secondary" @click.stop.prevent="updateOrganisms(node)" :name="orgStore.selectedNode.name === node.name?'radio_button_checked':'radio_button_unchecked'"/>
            <a class="link">{{node.name+' ('+node.rank+')'}}</a>
        </div>
        <div v-if="node.children && node.children.length" class="flex">
            <va-icon :name="node.isOpen? 'expand_less':'expand_more'"/>
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
        if(node.children.length){
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
    if(orgStore.selectedNode.name === node.name){
        orgStore.query.parent_taxid = null
        orgStore.selectedNode.name = ''
        orgStore.selectedNode.metadata = {}
        return
    }
    orgStore.selectedNode.name = node.name
    orgStore.selectedNode.metadata = {taxid: node.taxid, rank: node.rank, leaves: node.leaves}
    orgStore.query.parent_taxid = node.taxid
    orgStore.query.bioproject = null
}

</script>
