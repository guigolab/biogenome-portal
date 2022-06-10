<template>
    <div style="max-width:75%">
        <div v-for="(node,index) in taxStore.taxonNav" :key="node.taxid" style="padding:5px;width:fit-content">
            <div class="row justify--space-between align--center">
                <div class="flex">
                    <p style="font-size:.8rem">{{node.name+'('+node.rank+')'}}</p>
                </div>
                <div class="flex">
                    <va-icon @click="toggle(node,index)" name="radio_button_checked" :color="index === lastElementIndex?'success':'gray'"/>
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
    if(lastElementIndex !== index){
        taxStore.taxonNav = taxStore.taxonNav.slice(0, index+1)
        orgStore.query.taxid = taxStore.taxonNav[index].taxid
      }
    else {
        taxStore.taxonNav = taxStore.taxonNav.slice(0, index)
        orgStore.query.taxid = taxStore.taxonNav[index-1].taxid
    }
    taxStore.taxonNav = taxStore.taxonNav.slice(0, index+1)
    DataPortalService.getTaxonChildren(node.taxid)
    .then(resp => {
        nextTick(()=>{
            taxStore.tree = resp.data
        })
    })
}

</script>
<style scoped>
.bcrumb{
    /* position: absolute; */
    right: 10px;
    bottom: 10px;
    transform: rotate(-45deg);
    -ms-transform: rotate(-45deg);
    -moz-transform: rotate(-45deg);
    -webkit-transform: rotate(-45deg);
    -o-transform: rotate(-45deg);
    line-height: 15px;
    height: 15px;
    width: 15px;
    overflow: visible;
    white-space: nowrap;
    font-size: .8rem;
}
.btn-node{
    z-index: 3;
    position: absolute;
}
.btn-node::before{
    content: '';
    width: 10px;
    overflow: hidden;
    border-bottom: solid 2px gray;
    position: absolute;
    left: 0;
    top: 50%;
    /* z-index: 1; */

}

</style>