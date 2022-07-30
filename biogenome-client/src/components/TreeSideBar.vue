<template>
    <va-card class="custom-card">
        <va-card-title v-if="PROJECT_ACCESSION">
            bioprojects
        </va-card-title>
        <Transition duration="550" name="nested">
            <va-card-content v-if="PROJECT_ACCESSION">
                <div style="max-height:300px;overflow:scroll">
                    <BioProjectsTree :node="bioprjStore.tree"/>
                </div>
            </va-card-content>
        </Transition>
        <va-card-title>
          <div class="row justify--space-between">
            <div class="flex">
                taxons
            </div>
            <div class="flex">
              <va-input
                v-model="taxonName"
                placeholder="search taxon"
              >
                <template #appendInner>
                    <va-icon
                        name="search"
                    />
                </template>
              </va-input>
            </div>
          </div>
        </va-card-title>
        <Transition duration="550" name="nested">
            <va-card-content>
                <div style="max-height:300px;overflow:scroll">
                    <TreeBrowser :node="taxStore.tree"/>
                </div>
            </va-card-content>
        </Transition>
    </va-card>
</template>
<script setup>
import { onMounted,ref, watch } from 'vue'
import TreeBrowser from './TreeBrowser.vue'
import BioProjectsTree from '../components/BioProjectsTree.vue'
import DataPortalService from '../services/DataPortalService'
import {taxons} from '../stores/taxons'
import {bioprojects} from '../stores/bioprojects'
import {organisms} from '../stores/organisms'

const taxonName = ref("")
const taxStore = taxons()
const bioprjStore = bioprojects()
const orgStore = organisms()
const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION
onMounted(()=>{
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
        taxStore.tree = resp.data
        orgStore.selectedNode.name = resp.data.name
        orgStore.selectedNode.metadata = {taxid:resp.data.taxid, leaves: resp.data.leaves, rank: resp.data.rank}
        if(PROJECT_ACCESSION){
          return DataPortalService.getBioProjectChildren(PROJECT_ACCESSION)
        }
        return null
    })
    .then(resp => {
      if(resp){
        bioprjStore.tree = resp.data
      }
    })
})

watch(taxonName,()=>{
  DataPortalService.searchTaxons({name:taxonName.value})
  .then(resp => {
    console.log(resp)
    taxStore.tree = resp.data
  })
})
</script>
<style>
.nested-enter-active, .nested-leave-active {
	transition: all 0.3s ease-in-out;
}
/* delay leave of parent element */
.nested-leave-active {
  transition-delay: 0.25s;
}

.nested-enter-from,
.nested-leave-to {
  transform: translateY(30px);
  opacity: 0;
}

/* we can also transition nested elements using nested selectors */
.nested-enter-active .tree-container,
.nested-leave-active .tree-container { 
  transition: all 0.3s ease-in-out;
}
/* delay enter of nested element */
.nested-enter-active .tree-container {
	transition-delay: 0.25s;
}

.nested-enter-from .tree-container,
.nested-leave-to .tree-container {
  transform: translateX(30px);
  /*
  	Hack around a Chrome 96 bug in handling nested opacity transitions.
    This is not needed in other browsers or Chrome 99+ where the bug
    has been fixed.
  */
  opacity: 0.001;
}
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
ul{
  padding-left:1rem !important;
}
.tree-container{
    font-size: .8rem;
    border-left:2px solid transparent;
}
.selected{
    border-left:2px solid #7ab615;

}
.child-container:hover{
  background-color: #eff3f8;
}
.child-container{
    cursor: pointer;
    padding:10px;
    text-align: start;
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