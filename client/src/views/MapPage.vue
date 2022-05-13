<template>
    <b-container class="router-container" fluid>
        <b-row>
            <b-jumbotron header-tag="h2" bg-variant="white">
                <template #header>World Map</template>
                <template #lead>
                    This map shows the unique coordinates of all samples (samples acquired and samples submitted to INSDC)                </template>
                <hr class="my-4">
                <p>
                    Click on the <img src="/red-dot.svg"/> to see all the samples in those coordinates
                </p>
            </b-jumbotron>
        </b-row>
        <b-row>
            <b-col>
                <b-row class="map-container">
                    <map-container :geojson="geoJson"/>
                </b-row>
            </b-col>
        </b-row>
    </b-container>
</template>
<script>

import portalService from '../services/DataPortalService'
import MapContainer from '../components/base/MapContainer.vue'
import {BJumbotron} from 'bootstrap-vue'
export default {
    data(){
        return {
            geoJson:null,
        }
    },
    components:{
        MapContainer,BJumbotron
    },
    mounted(){
        this.show=true
        this.$store.dispatch('portal/showLoading')
        portalService.getGeoLocSamples()
        .then(resp => {
            console.log(resp)
            if(resp && resp.data){
                this.geoJson = resp.data
                this.$store.dispatch('portal/hideLoading')
            //     const geoJson = {
            //     type: 'FeatureCollection',
            //     crs: {
            //         'type': 'name',
            //         'properties': {
            //             'name': 'EPSG:3857'
            //         }
            //     },
            //     features : []
            // }
            // resp.data.forEach(record => {
            //     const feature = {
            //         'type': 'Feature',
            //         'geometry': {
            //             'type': 'Point',
            //             'coordinates': [record.geographic_location_longitude, record.geographic_location_latitude],
            //         },
            //         // 'metadata': {id: record.accession || record.tube_or_well_id, name: record.scientificName}

            //     }
            //     geoJson.features.push(feature)
            // })
            // this.geoJson = geoJson            
            }
        })
    }
}
</script>
<style scoped>
.map-container{
    width: 100%;
    height: 100%;
    min-height: 600px
}
</style>