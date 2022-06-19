<template>
<div v-if="organismLoaded" class="row">
    <div class="flex">
        <va-card class="custom-card">
            <va-card-content>
                <div class="row">
                    <div class="flex">
                        <p class="title">{{organism.scientific_name}}</p>
                    </div>
                </div>
                <div class="row justify-content--space-between">
                    <div class="flex">
                        <p class="text--secondary">{{organism.insdc_common_name}}</p>
                    </div>
                    <div class="flex">
                        <p class="text--secondary">{{organism.taxid}}</p>
                    </div>
                </div>
            </va-card-content>
        </va-card>
    </div>
    <div v-for="key in organismData.dataKeys" :key="key" class="flex">
        <va-card class="custom-card">
            <va-card-title>
                <div class="row justify--space-between align--center">
                    <div class="flex">
                        {{key}}
                    </div>
                    <div class="flex">
                        <va-icon 
                            :name="dataIcons[key].icon"
                            :color="dataIcons[key].color"
                        >
                        </va-icon>
                    </div>
                </div>
            </va-card-title>
            <va-card-content>
                <va-data-table 
                    :items="organism[key]"
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
                    
                    <!-- <template #cell(experiment_accession)="{ rowData }"><va-chip icon="search" @click="console.log(rowData)" size="small">details</va-chip></template>
                    <template #cell(accession)="{ rowData }"><a class="link">{{rowData}}</a></template>
                    <template #cell(name)="{ rowData }"><va-chip icon="search" @click="console.log(rowData)" size="small">details</va-chip></template>
                    <template #cell(local_id)="{ rowData }"><va-chip icon="search" @click="console.log(rowData)" size="small">details</va-chip></template> -->
                </va-data-table>
            </va-card-content>
        </va-card>
    </div>
    <!-- <div class="flex">
        <va-card>
            <va-card-title>
                location
            </va-card-title>
            <va-card-content>
                <MapComponent :taxid="organism.taxid"/>
            </va-card-content>
        </va-card>
    </div> -->
</div>
        <!-- <div class="row">
            <div class="row justify--start">
                <div class="flex">
                    <p class="title">{{organism.scientific_name}}</p>
                </div>
            </div>
            <div class="row justify--start">
                <div style="padding-left:10px" class="flex">
                    <p class="text--secondary">{{organism.insdc_common_name}}</p>
                </div>
            </div>
            <va-divider orientation="left">
                <p class="title">Lineage</p>
            </va-divider>
            <div style="font-size:.8rem" class="row">
                <div class="flex">
                    <a v-for="taxon in organism.taxon_lineage.reverse()" :key="taxon.taxid" class="link">{{taxon.name+' ('+taxon.rank+')'}}</a>
                </div>
            </div>
            <va-divider orientation="left">
                <p class="title">Bioprojects</p>
            </va-divider>
            <div style="font-size:.8rem" class="row">
                <div class="flex">
                    <a v-for="project in organism.bioprojects" :key="project.accession" class="link">{{project.title}}</a>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div v-for="key in organismData.dataKeys" :key="key" class="flex">
                <va-card>
                    <va-card-title>
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                {{key}}
                            </div>
                            <div class="flex">
                                <va-icon 
                                    :name="dataIcons[key].icon"
                                    :color="dataIcons[key].color"
                                >
                                </va-icon>
                            </div>
                        </div>
                    </va-card-title>
                    <va-card-content>
                         <div class="row">
                            <div class="flex">
                                <ul>
                                    <li v-for="(d,index) in organismData.organism[key]" :key="index">
                                    </li>
                                </ul>
                            </div>
                        </div> 
                    </va-card-content>
                </va-card>
            </div>
        </div>
    </div>
</div> -->

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

const organismLoaded = ref(false)

//static object
var organism = null

const organismData = reactive({
    dataKeys:[]
})

function toggledMetadata(value){
    console.log(value)
}

onMounted(()=>{
    DataPortalService.getOrganism(props.taxid)
    .then(response => {
        nextTick(()=>{
            organismLoaded.value = false
            organism = response.data
            organismData.dataKeys = Object.keys(dataIcons).filter(d => organism[d].length)
            organismLoaded.value = true
        })
    })
})
</script>