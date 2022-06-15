<template>
<va-card>
    <va-card-title>
        {{organism.scientific_name}}
    </va-card-title>
    <va-card-content>
        <div class="row">
            <div class="flex">

            </div>
        </div> 
        <va-divider>    
        <div class="row">
            <div class="flex">
                <div class="row">
                    <div v-for="key in dataKeys" :key="key" class="flex">
                        <va-chip size="small" :icon="dataIcons[dataKey].icon" :color="dataIcons[dataKey].color">{{dataKey}}</va-chip> 
                    </div>
                </div>
            </div>
        </div>
    </va-card-content>
</va-card>
</template>
<script setup>
import { computed, nextTick, onMounted, reactive, ref } from '@vue/runtime-core'
import {dataIcons} from '../../config'
import DataPortalService from '../services/DataPortalService'


const props = defineProps({
    organism:Object
})

onMounted(()=>{
    
})

const dataKeys = computed(()=>{
    return Object.keys(dataIcons).filter(d => props.organism[d].length)
})

// onMounted(()=>{
//     DataPortalService.getOrganism(props.taxid)
//     .then(response => {
//         nextTick(()=>{
//             organism.value = response.data
//             console.log(organism.value)
//             dataKeys.value = Object.keys(dataIcons).filter(d => organism.value[d].length)
//         })

//     })
// })
</script>