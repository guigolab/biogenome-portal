<template>
    <div class="row">
        <div v-for="dt in Object.keys(data)" :key="dt" class="flex">
            <va-card @click="dataSelected(dt)" class="custom-card">
                <va-card-title>{{dt}}</va-card-title>
                <va-card-content>
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <p style="font-size:0.8rem" class="text--secondary"><strong>{{'organisms :'+data[dt].organisms}}</strong></p>
                            <p style="font-size:0.8rem" class="text--secondary"><strong>{{'total '+ dt +': '+data[dt].total}}</strong></p>
                        </div>
                        <div class="flex">
                            <va-icon 
                                :name="dataIcons[dt].icon"
                                :color="dataIcons[dt].color"
                            >
                            </va-icon>
                        </div>  
                    </div>
                </va-card-content>
            </va-card> 
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from '@vue/runtime-core'
import {dataIcons} from '../../config'
import DataPortalService from '../services/DataPortalService'


const emit = defineEmits(['onDataSelection'])

function dataSelected(dataKey){
    emit('onDataSelection',dataKey)
}

var data = ref({})

onMounted(()=>{
    DataPortalService.getStats()
    .then(resp =>{
        data.value = {...resp.data}
    })
})

</script>