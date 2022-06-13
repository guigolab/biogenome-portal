<template>

<div class="row">
    <div class="flex lg12">
        <va-card>
            <va-card-title>World map
            </va-card-title>
            <va-card-content class="map-container">
                <!-- <MapComponent v-if="showMap" :geojson="geojson"/> -->
                <CesiumComponent v-if="showMap" :geojson="geojson"/>
            </va-card-content>
        </va-card>
    </div>
</div>
</template>
<script setup>
import { onMounted, reactive, nextTick,ref } from 'vue'
import MapComponent from '../components/MapComponent.vue'
import CesiumComponent from '../components/CesiumComponent.vue'
import DataPortalService from '../services/DataPortalService'

var geojson = reactive(null)
var showMap = ref(false)

onMounted(()=>{
    DataPortalService.getAllCoordinates()
    .then(resp => {
        // nextTick(()=>{
            geojson = resp.data
            showMap.value = true
            console.log(geojson)
        // })
    })
})

</script>
<style>
.map-container{
    width: 100%;
    height: 100%;
    min-height: 600px
}
</style>