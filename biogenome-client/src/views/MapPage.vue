<template>

<div class="row">
    <Transition>
        <div class="flex lg3 md3 sm3">
            <OrganismList :organisms="organisms" :total="total" @on-update-query="updateQuery" :query="query"/>
        </div>
    </Transition>
    <div class="flex lg9 md9 sm9">
        <va-card>
            <va-card-title>World map</va-card-title>
            <va-card-content class="map-container">
                <CesiumComponent @on-entity-selection="updateQuery" v-if="showMap" :geojson="geojson"/>
            </va-card-content>
        </va-card>
    </div>
</div>
</template>
<script setup>
import { onMounted, reactive, nextTick,ref, watch } from 'vue'
import MapComponent from '../components/MapComponent.vue'
import CesiumComponent from '../components/CesiumComponent.vue'
import OrganismList from '../components/OrganismList.vue'
import DataPortalService from '../services/DataPortalService'

var showOrganisms = ref(false)
var geojson = reactive(null)
var showMap = ref(false)

var organisms = ref([])
var total = ref(0)

const query = reactive({
    parent_taxid:null,
    offset:0,
    limit:20,
    filter:null,
    filter_option:null,//scientificName by default
    bioproject:null,
    coordinates:true,
    geo_location:null,
    biosamples:null,
    local_samples:null,
    assemblies:null,
    experiments:null,
    annotations:null,
    sort_order:null,
    sort_column:null
})

watch(query, (newValue,oldValue)=>{
    console.log(newValue)
    console.log(oldValue)
})

onMounted(()=>{
    DataPortalService.getAllCoordinates()
    .then(resp => {
        geojson = resp.data
        showMap.value = true
        return DataPortalService.getOrganisms(query)
    })
    .then(resp => {
        organisms.value = resp.data.data
        total.value = resp.data.total
    })
})

function updateQuery(payload){
    query[payload.label] = payload.value
}
// function showOrganismList(value){
//     if(value){
//         organisms.value = value.organisms
//         total.value = value.organisms.length 
//         showOrganisms.value=true
//     }else{
//         showOrganisms.value=false
//         organisms.value=[]
//         total.value=0
//     }
    
// }
</script>
<style>
.map-container{
    width: 100%;
    height: 100%;
    min-height: 600px
}
</style>
<style scoped>
/* we will explain what these classes do next! */
.v-enter-active{
  transition: opacity 0.5s ease;
}

.v-enter-from{
  opacity: 0;
}
</style>