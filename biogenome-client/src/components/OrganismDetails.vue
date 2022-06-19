<template>
<va-card class="custom-card">
    <va-card-title>
        {{organism.scientific_name}}
    </va-card-title>
    <va-card-content>
        <div style="font-size:.8rem" class="row">
            <div class="flex">
                <a v-for="taxon in organism.taxon_lineage.reverse()" :key="taxon.taxid" class="link">{{taxon.name+' ('+taxon.rank+')'}}</a>
            </div>
        </div>
        <va-divider/>
        <div style="font-size:.8rem" class="row">
            <div class="flex">
                <a v-for="project in organism.bioprojects" :key="project.accession" class="link">{{project.title}}</a>
            </div>
        </div>
        <va-divider/>   
        <div class="row">
            <div class="flex">
                <div class="row">
                    <div v-for="key in dataKeys" :key="key" class="flex">
                        <va-icon :name="dataIcons[key].icon" :color="dataIcons[key].color"/>
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
 var dataValue = ref()

onMounted(()=>{
    dataValue.value = dataKeys[0]
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