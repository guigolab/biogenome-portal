<template>
<li :class="orgStore.selectedNode.name === node.title?'tree-container'+' '+'selected':'tree-container'" :id="node.accession">
    <div @click="toggle(node)" class="child-container row justify--space-between align--center">
        <div class="flex">
            <va-icon @click.stop.prevent="updateOrganisms(node)" :name="orgStore.selectedNode.name === node.title?'radio_button_checked':'radio_button_unchecked'"/>
            <a class="link">{{node.title}}</a>
        </div>
        <div style="text-align:end" v-if="node.children && node.children.length" class="flex">
            <va-icon color="gray" :name="node.isOpen? 'expand_less':'expand_more'"/>
        </div>
    </div>
    <Transition name="slide-fade">
        <ul v-if="node.children && node.children.length && node.isOpen">
            <BioProjectsTree
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
import BioProjectsTree from './BioProjectsTree.vue';
import { computed, onMounted, ref, nextTick, reactive } from 'vue';
import DataPortalService from '../services/DataPortalService'
import {organisms} from '../stores/organisms'

const orgStore = organisms()
const props = defineProps({
    node:Object
})



function toggle(node){
    if(!node.isOpen){
        if(!node.children.filter(ch => ch && ch.children).length){
            DataPortalService.getBioProjectChildren(node.accession)
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
    if(orgStore.selectedNode.name === node.title){
        orgStore.query.bioproject = null
        orgStore.selectedNode.name = ''
        orgStore.selectedNode.metadata = {}
        return
    }
    orgStore.selectedNode.name = node.title
    orgStore.selectedNode.metadata = {accession: node.accession}
    orgStore.query.bioproject = node.accession
    orgStore.query.parent_taxid = null
}

</script>
