<template>
    <li class="tree-container" style="list-style:none">
        <div class="custom-card">
            <va-card @click="toggle(node)" class="box" style="padding:10px">
                <div class="row justify--space-between align--center">
                    <div class="flex lg8 md8 sm8 xs8">
                        <div class="row align--center justify--start">
                            <div v-if="node.children && node.children.length" class="flex">
                                <va-icon :name="node.isOpen? 'expand_less':'expand_more'"/>
                            </div>
                            <div class="flex lg10 md10 sm10 xs10" style="text-align:start;padding-left: 5px;">
                                <va-popover v-if="node.leaves" :message="`organisms: ${node.leaves}`">
                                    <p style="text-align:start;font-size: 16px;">{{node.name || node.title}}</p>
                                    <div class="row align--center justify-content--space-between">
                                        <div class="flex text--secondary" style="font-size: 16px;">
                                            <p style="text-align:start">{{node.rank || node.accession}}</p>
                                        </div>
                                    </div>
                                </va-popover>
                            </div>
                        </div>
                    </div>
                    <div class="flex">
                        <va-button v-if="node.rank" icon="insights" flat @click="toTreeOfLife(node)"/>
                        <va-button flat @click.stop.prevent="toPage(node)" icon="visibility"/>
                    </div>
                </div>
            </va-card>
        </div>
        <Transition name="slide-fade">
            <ul style="padding-left:10px" v-if="node.children && node.children.length && node.isOpen">
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
import NodeIterator from './NodeIterator.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
    node:Object,
    model:Object
})
function toggle(node){
    if(!node.isOpen){
        if(node.children.length){
            const id = node.taxid || node.accession
            props.model.defaultQuery(id)
            .then(resp => {
                node.children = resp.data.children
            })
        }
    }
    node.isOpen = !node.isOpen
}
function toPage(node){
    router.push({name:props.model.value,params:{id:node[props.model.id]}})
}
function toTreeOfLife(node){
    router.push({name:"tree",params:{taxid:node.taxid}})
}
</script>
