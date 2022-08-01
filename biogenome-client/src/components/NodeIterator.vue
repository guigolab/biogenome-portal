<template>
    <li :class="orgStore.selectedNode.name === node[model.respLabel]?'tree-container selected-node':'tree-container'" :id="node[model.respLabel]">
        <va-card class="node-card child-container box">
            <div @click="toggle(node)" class="row justify--space-between align--center">
                <div class="flex lg8 md8 sm8 xs8">
                    <div class="row align--center justify--start">
                        <div class="flex">
                            <va-icon @click.stop.prevent="updateOrganisms(node)" :name="orgStore.selectedNode.name === node[model.respLabel]?'radio_button_checked':'radio_button_unchecked'"/>
                        </div>
                        <div class="flex lg8 md8 sm8 xs8">
                            <p style="padding-left:5px">{{node.rank ? node.name+' ('+node.rank+')': node.title + ' ('+node.accession+')'}}</p>
                        </div>
                    </div>
                </div>
                <div v-if="node.children && node.children.length" class="flex">
                    <va-icon :name="node.isOpen? 'expand_less':'expand_more'"/>
                </div>
            </div>
        </va-card>
        <Transition name="slide-fade">
            <ul v-if="node.children && node.children.length && node.isOpen">
                <NodeIterator
                    v-for="(child, index) in node.children"
                    class="node"
                    :key="index"
                    :node="child"
                    :model="model"
                />
            </ul>
        </Transition>
    </li>
</template>
<script setup>
import TreeBrowser from './TreeBrowser.vue';
import NodeIterator from './NodeIterator.vue'
import { computed, onMounted, ref, nextTick } from 'vue';
import DataPortalService from '../services/DataPortalService'
import {organisms} from '../stores/organisms'
import {taxons} from '../stores/taxons'

const taxStore = taxons()
const orgStore = organisms()

const props = defineProps({
    node:Object,
    model:Object
})

function toggle(node){
    if(!node.isOpen){
        if(node.children.length){
            props.model.defaultQuery(node[props.model.id])
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
    if(orgStore.selectedNode.name === node[props.model.respLabel]){
        orgStore.query.parent_taxid = null
        orgStore.query.bioproject = null
        orgStore.selectedNode.name = ''
        orgStore.selectedNode.metadata = {}
        return
    }
    orgStore.selectedNode.name = node[props.model.respLabel]
    const metadata = {}
    props.model.metadataFields.forEach(f => {
        metadata[f] = node[f]
    })
    orgStore.selectedNode.metadata = {...metadata}
    if(props.model.id === 'taxid'){
        orgStore.query.parent_taxid = node.taxid
        orgStore.query.bioproject = null
    }else{
        orgStore.query.parent_taxid = null
        orgStore.query.bioproject = node.accession
    }
}

</script>
