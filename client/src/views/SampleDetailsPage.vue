<template>
<b-row>
    <b-col>
        <b-row>
        <b-col v-if="geojson" lg="5">
            <b-row class="map-container">
                <map-container :geojson="geojson"/>
            </b-row>
        </b-col>
        <b-col v-if="sample">
            <b-row>
                <b-col>
                    <div>
                        <h2>{{sample.accession || sample.tube_or_well_id}}</h2>
                    </div>
                </b-col>
            </b-row>
            <b-row>
                <b-col cols="2" v-if="sample.collection_date">
                    <div>
                        <p class="info-icons"><b-icon-calendar/> {{sample.collection_date}}</p>
                    </div>
                </b-col>
                <b-col v-if="sample.geographic_location_region_and_locality">
                    <div>
                        <p class="info-icons">
                            <b-icon-geo-alt-fill/> 
                            {{validCoordinates ? sample.geographic_location_region_and_locality + ' (' + sample.geographic_location_longitude + ', '+ sample.geographic_location_latitude + ') ': sample.geographic_location_region_and_locality }}
                        </p>
                    </div>
                </b-col>
            </b-row>
            <b-row>
                <b-col>
                    <b-badge style="margin-right:5px" variant='info' pill><strong> {{sample.taxid}} </strong></b-badge>
                    <b-badge v-if="sample.tolid" style="margin-right:5px" pill variant='secondary'><strong> {{sample.tolid}}</strong></b-badge>
                    <b-badge v-if="sample.accession" style="margin-right:5px" pill variant="success" :href="'https://www.ebi.ac.uk/biosamples/samples/'+sample.accession" target="_blank">BioSamples</b-badge>
                </b-col>
            </b-row>
         </b-col>
    </b-row>
    <sample-details-component v-if="sample" :sample="sample"/>
    </b-col>
</b-row>

</template>
<script>
import {BBadge,BIconCalendar, BIconGeoAltFill} from 'bootstrap-vue'
import SampleDetailsComponent from '../components/sample/SampleDetailsComponent.vue'
import portalService from '../services/DataPortalService'
import MapContainer from '../components/base/MapContainer.vue'

export default {
    props: ['accession'],
    watch:{
        accession: function(accession){
            this.getSample(accession)
        }
    },
    data(){
        return {
            sample:null,
            geojson:null
        }
    },
    created(){
        this.getSample(this.accession)
    },
    methods:{
        getSample(accession){
        this.$store.dispatch('portal/showLoading')
        portalService.getSample(accession)
        .then(response => {
            this.sample = response.data
            this.$store.commit('portal/setBreadCrumb', {value: {text: accession, to: {name: 'sample-details', params:{accession: accession}}}})
            this.$store.dispatch('portal/hideLoading')
            const id = this.sample.accession? this.sample.accession : this.sample.tube_or_well_id
            return portalService.getGeoLocSamples([id])
            })
            .then(response =>{
                this.geojson = {...response.data}
            })
        }
    },
    components: {
        SampleDetailsComponent, BBadge,BIconCalendar, BIconGeoAltFill,
        MapContainer
    }
}
</script>
<style scoped>
.map-container{
    width: 100%;
    height: 100%;
    min-height: 150px
}
</style>

