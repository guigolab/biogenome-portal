<template>
<div v-if="organismLoaded" class="row">
    <div class="flex">
        <div class="row align--center">
            <div style="padding:15px" class="flex">
                <h1 class="display-3">{{organism.scientific_name}}</h1>
                <div class="row justify--space-between">
                    <div class="flex">
                        <p class="text--secondary">{{organism.insdc_common_name}}</p>
                    </div>
                    <div class="flex">
                        <p class="text--secondary">{{organism.tolid_prefix}}</p>
                    </div>
                </div>
            </div>
            <div style="padding:15px" class="flex">
                <va-button  outline>Overview</va-button>
                <va-button  v-for="key in organismData.dataKeys" :key="key" @click="toggleTable(key)" :color="dataIcons[key].color" outline :icon="dataIcons[key].icon">{{key}}</va-button>
            </div>
        </div>
        <va-divider/>
        <div class="row">
            <div class="flex">
                <va-card>
                    <va-card-title>
                        Lineage
                    </va-card-title>
                    <va-card-content>
                        <ul>
                            <li v-for="taxon in organism.taxon_lineage" :key="taxon.taxid">
                                <p class="text--secondary">{{taxon.name + ' ('+taxon.rank+')'}}</p>
                            </li>
                            <!-- <li v-for="taxon in organism.taxon_lineage" :key="taxon.taxid">
                                <router-link :to="{name:'tree-of-life'}"><p>{{taxon.name + ' ('+taxon.rank+')'}}</p></router-link>
                            </li> -->
                        </ul>
                    </va-card-content>
                </va-card>
            </div>
        </div>
        <!-- <va-card class="custom-card">
            <va-card-content>
                <div class="row">
                    <div v-for="key in organismData.dataKeys" :key="key" class="flex">
                        <va-button @click="toggleTable(key)" :color="dataIcons[key].color" outline :icon="dataIcons[key].icon">{{key}}</va-button>
                    </div>
                </div>
                <div v-show="showTable" class="row">
                    <div class="flex">
                        <va-data-table 
                            :items="organismData.loadedItems"
                            sticky-header
                            height="180px"
                            :style="{
                                '--va-data-table-scroll-table-color': 'white',
                            }"
                            >
                            <template #header(metadata)></template>
                            <template #header(sub_samples)>related samples</template>
                            <template #cell(chromosomes)="{ rowData }">
                                <va-button-dropdown v-if="rowData.chromosomes && rowData.chromosomes.length" size="small" flat>
                                    <ul>
                                        <li v-for="chr in rowData.chromosomes" :key="chr">
                                            <a class="link">{{chr}}</a>
                                        </li>
                                    </ul>
                                </va-button-dropdown>
                            </template>
                            <template #cell(sub_samples)="{ rowData }">
                                <va-button-dropdown v-if="rowData.sub_samples && rowData.sub_samples.length" size="small" flat>
                                    <ul>
                                        <li v-for="acc in rowData.sub_samples" :key="acc">
                                            <a class="link">{{acc}}</a>
                                        </li>
                                    </ul>
                                </va-button-dropdown>
                            </template>
                            <template #cell(metadata)="{ rowData }"><va-icon name="search" :color="dataIcons[key].color" @click="toggledMetadata(rowData)"/></template>
                        </va-data-table>
                    </div>
                </div>
            </va-card-content>
        </va-card> -->
    </div>
</div>

    <!-- <div>
        Organism details:
        photo??
        <va-avatar>
        </va-avatar>
        <va-card>
            <va-card-title>
            </va-card-title>
        </va-card>
        <va-card>
            <va-card-title>
            </va-card-title>
        </va-card>
        lineage
        map
        bioproject
        taxid,tolid
        goat status
        insdc status

        Organism data:
        biosamples
        local_samples
        assemblies
        experiments
        annotations
        
        
         -->
</template>
<script setup>
import OrganismDetails from '../components/OrganismDetails.vue'
import { computed, nextTick, onMounted, reactive, ref } from '@vue/runtime-core'
import {dataIcons} from '../../config'
import DataPortalService from '../services/DataPortalService'
// import MapComponent from '../components/MapComponent.vue'



const props = defineProps({
    taxid:String
})
const showTable = ref(false)
const organismLoaded = ref(false)
const hasCoordinates = ref(false)
//static object
var organism = null
var geoJson = null

const organismData = reactive({
    dataKeys:[],
    loadedItems:[]
})

function toggledMetadata(value){
    console.log(value)
}
function toggleTable(key){
    showTable.value = false
    organismData.loadedItems = organism[key]
    showTable.value = true
}
onMounted(()=>{
    DataPortalService.getOrganism(props.taxid)
    .then(response => {
        organismLoaded.value = false
        organism = response.data
        organismData.dataKeys = Object.keys(dataIcons).filter(d => organism[d].length)
        organismData.loadedItems = organism[organismData.dataKeys[0]]
        organismLoaded.value = true
        showTable.value = true
        if (organism.coordinates.length){
            return DataPortalService.getCoordinates(organism.coordinates)
        }
    })
})
</script>