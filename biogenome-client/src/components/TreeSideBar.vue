<template>
    <va-card class="custom-card">
        <va-card-title>
        <div class="row align--center">
            <div class="flex">
                <va-icon 
                    name="menu"
                    @click="nodeToggled(!toggle)"
                    :color="toggle?'success':'gray'"
                >
                </va-icon>
            </div>
        </div>
        </va-card-title>
        <Transition duration="550" name="nested">
            <va-card-content v-if="toggle">
                <div style="max-height:80vh;overflow:scroll">
                    <TreeBrowser :node="taxStore.tree"/>
                </div>
            </va-card-content>
        </Transition>
    </va-card>
</template>
<script setup>
import { onMounted,ref } from 'vue'
import TreeBrowser from './TreeBrowser.vue'
import DataPortalService from '../services/DataPortalService'
import {taxons} from '../stores/taxons'
import {ROOTNODE} from '../../config'


const taxStore = taxons()
const emit = defineEmits(['onToggle'])

const props = defineProps({
    toggle:Boolean
})
onMounted(()=>{
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
        taxStore.tree = resp.data
        taxStore.initializeTaxNav()
        
    })
})
function nodeToggled(value){
    emit('onToggle',value)
}
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
</style>