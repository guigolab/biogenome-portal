<template>
    <div v-if="dataKeys" class="row">
        <div class="flex">
            <div class="row">
                <div v-if="organism.image" class="flex">
                    <va-avatar
                        :src="'data:image/jpeg;base64,'+organism.image"
                    >
                    </va-avatar>
                </div>
                <div class="flex">
                    <p class="title">{{organism.scientific_name}}</p>
                </div>
            </div>
            <div class="row">
                <div v-for="key in dataKeys" :key="key" class="flex">
                    <va-icon :name="dataIcons[dataKey].icon" :color="dataIcons[dataKey].color"/> 
                </div>
            </div>
            
        </div>
    </div>
    <!-- <div v-if="dataKeys && dataKeys.length" class="row">
        <va-tabs
            v-model="currentValue"
            style="width: 300px"
        >
            <template #tabs>
                <va-tab
                    v-for="dataKey in dataKeys"
                    :label="dataKey"
                    name="icon"
                    :key="dataKey"
                    :icon="dataIcons[dataKey].icon"
                    :color="dataIcons[dataKey].color"
                >
                    {{ dataKey }}
                </va-tab>
            </template>
        </va-tabs>
    </div> -->

        <!-- <div class="flex">
            <va-card>
                <va-card-title>
                    {{dataKeys[currentValue]}}
                </va-card-title>
                <va-card-content>
                    <va-data-table :items="organism[currentValue]">
                    </va-data-table>
                </va-card-content>
            </va-card>
        </div> -->
</template>
<script setup>
import { computed, nextTick, onMounted, reactive, ref } from '@vue/runtime-core'
import {dataIcons} from '../../config'
import DataPortalService from '../services/DataPortalService'


const props = defineProps({
    taxid:String
})

var organism = ref()
const dataKeys = ref()

onMounted(()=>{
    DataPortalService.getOrganism(props.taxid)
    .then(response => {
        nextTick(()=>{
            organism.value = response.data
            console.log(organism.value)
            dataKeys.value = Object.keys(dataIcons).filter(d => organism.value[d].length)
        })

    })
})
</script>