<template>
    <div class="row">
        <div v-for="(node,index) in taxStore.taxonNav" :key="node.taxid" class="flex">
            <div class="row justify--start align--center">
                    <div class="flex">
                    <va-icon name="trending_flat" color="gray"/>
                </div>
                <div class="flex">
                    <va-chip shadow @click="toggle(node,index)" size="small" :color="index === lastElementIndex?'success':'gray'">
                        {{node.name+' ('+node.rank+')'}}
                    </va-chip>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import { organisms } from '../stores/organisms'
import {taxons} from '../stores/taxons'
import DataPortalService from '../services/DataPortalService'
import { computed, nextTick } from 'vue'

const taxStore = taxons()
const orgStore = organisms()

const lastElementIndex = computed(()=>{
    return taxStore.taxonNav.length -1
})

function toggle(node,index){
    DataPortalService.getTaxonChildren(node.taxid)
    .then(resp => {
        nextTick(()=>{
            taxStore.tree = resp.data
            if(lastElementIndex !== index){
                taxStore.taxonNav = taxStore.taxonNav.slice(0, index+1)
                orgStore.query.parent_taxid = taxStore.taxonNav[index].taxid
            }
            else {
                taxStore.taxonNav = taxStore.taxonNav.slice(0, index)
                orgStore.query.parent_taxid = taxStore.taxonNav[index-1].taxid
            }
        })
    })
}

</script>
