<template>
    <b-container class="router-container" fluid>
        <b-row>
            <b-col lg="6">
                <multi-select-component/>
            </b-col>
        </b-row>
        <b-row>
            <b-col>
                <b-row class="map-container">
                    <map-container :geojson="geoJson"/>
                </b-row>
            </b-col>
        </b-row>
        <b-row style="min-height:200px">
        </b-row>
    </b-container>
</template>
<script>

import portalService from '../services/DataPortalService'
import MapContainer from '../components/base/MapContainer.vue'
import MultiSelectComponent from '../components/base/MultiSelectComponent.vue'
export default {
    data(){
        return {
            geoJson:null,
        }
    },
    computed:{
        selectedBioproject(){
           return this.$store.getters['portal/getSelectedBioproject']
        }
    },
    watch:{
        selectedBioproject(value){
            this.getCoordinates(value)
        }
    },
    components:{
        MapContainer,
        MultiSelectComponent
    },
    mounted(){
        this.getCoordinates(this.selectedBioproject)
    },
    methods:{
        getCoordinates(bioproject){
            this.$store.dispatch('portal/showLoading')
            portalService.getAllCoordinates({bioproject: bioproject})
            .then(resp => {
                if(resp && resp.data){
                    this.geoJson = resp.data         
                }
                else{
                    this.geoJson = null
                }
                this.$store.dispatch('portal/hideLoading')
            })
            .catch(e=>{
                console.log(e)
                this.$store.dispatch('portal/hideLoading')         
            })
        }
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