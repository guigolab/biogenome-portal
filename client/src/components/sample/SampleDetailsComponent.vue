<template>
<b-container class="router-container" fluid>
    <b-row>
        <b-col v-if="validCoordinates" lg="5">
            <b-row class="map-container">
                <map-container :geojson="geojson"/>
            </b-row>
        </b-col>
        <b-col>
            <b-row>
                <b-col>
                    <div>
                        <h2>{{sample.accession || sample.sample_unique_name}}</h2>
                    </div>
                </b-col>
            </b-row>
            <b-row>
                <b-col cols="2">
                    <div>
                        <p class="info-icons"><b-icon-calendar/> {{sample.collection_date}}</p>
                    </div>
                </b-col>
                <b-col>
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
    <b-row>
        <b-col>
            <b-tabs
                pills
                content-class="mt-3" fill
                v-model="tabIndex"
            >
                <b-tab :title-link-class="linkClass(0)" active class="tab-element">
                    <template #title>
                        <strong>Details</strong>
                    </template>
                    <table-component :sticky-header="stickyHeader" :items="[metadata()]" :stacked="true">
                        <template #cell(accession)="data">
                            <b-link v-if="data.value" :href="'https://www.ebi.ac.uk/ena/browser/view/'+ data.value" target="_blank">{{data.value}}</b-link>
                        </template>
                    </table-component>
                </b-tab>
                <b-tab v-if="sample.specimens && sample.specimens.length > 0" :title-link-class="linkClass(1)" class="tab-element" lazy>
                    <template #title>
                        <strong>Specimens  </strong><b-badge :variant="linkVariant(1)" pill>{{sample.specimens.length}}</b-badge>
                    </template>
                    <sample-component :samples="sample.specimens"/>
                </b-tab>
                <b-tab :title-link-class="linkClass(assIndex)" class="tab-element" v-if="sample.assemblies && sample.assemblies.length" lazy>
                    <template #title>
                        <strong>Assemblies  </strong><b-badge :variant="linkVariant(assIndex)" pill>{{sample.assemblies.length}}</b-badge>
                    </template>
                    <assemblies-component :assemblies="sample.assemblies"/>
                </b-tab>
                <b-tab :title-link-class="linkClass(expIndex)" class="tab-element"  v-if="sample.experiments && sample.experiments.length" lazy>
                    <template #title>
                        <strong>Experiments  </strong><b-badge :variant="linkVariant(expIndex)" pill>{{sample.experiments.length}}</b-badge>
                    </template>
                    <experiments-component :experiments="sample.experiments"/>
                </b-tab>
            </b-tabs>
        </b-col>
    </b-row>
</b-container>
</template>

<script>
import {BTabs,BLink,BTab, BBadge,BIconCalendar, BIconGeoAltFill} from 'bootstrap-vue'
import MapContainer from '../base/MapContainer.vue'
import AssembliesComponent from '../AssembliesComponent.vue'
import ExperimentsComponent from '../ExperimentsComponent.vue'
import SampleComponent from './SampleComponent.vue'
import TableComponent from '../base/TableComponent.vue'
// import Feature from 'ol/Feature'
export default {
    components: {BTabs,BTab,BIconCalendar, BIconGeoAltFill,BLink,TableComponent, BBadge, MapContainer, AssembliesComponent, ExperimentsComponent, SampleComponent},
    props:['sample'],
    computed:{
        validCoordinates(){
            return this.sample.geographic_location_longitude 
            && this.sample.geographic_location_latitude 
            //add numeric control isNaN and isNan(parseFloat)
        },
        expIndex(){
            if(this.haveItems(this.sample.assemblies) && this.haveItems(this.sample.specimens)){
                return 3
            }else if (this.haveItems(this.sample.assemblies) || this.haveItems(this.sample.specimens)) {
                return 2
            } else {
                return 1
            }
        },
        assIndex(){
            if(this.haveItems(this.sample.specimens)){
                return 2
            }else  {
                return 1
            }
        }
    },
    data(){
        return {
            geojson:null,
            excludedFields: ['_id', 'experiments', 'assemblies', 'specimens'],
            tabIndex:0,
        }
    },
    mounted(){
        if(this.validCoordinates){
            this.createGeoJson()
        }
    },
    methods: {
        haveItems(arr){
            return arr && arr.length > 0
        },
        metadata(){
            const mappedSample = {}
            Object.keys(this.sample)
            .filter(key => !this.excludedFields.includes(key) && (this.sample[key]))
            .forEach(key => {
                if(this.sample[key] && key !== 'custom_fields'){
                    mappedSample[key] = this.sample[key]
                }
            })
            return mappedSample
        },
        createGeoJson(){
            const geoJson = {
                'type': 'FeatureCollection',
                'crs': {
                    'type': 'name',
                    'properties': {
                        'name': 'EPSG:3857'
                    }
                },
                'features': []
            }
                const feature = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [this.sample.geographic_location_longitude, this.sample.geographic_location_latitude]
                    }
                }
            geoJson.features.push(feature)
            this.geojson = geoJson                 
        },
        linkClass(idx) {
            if (this.tabIndex === idx) {
                return ['bg-secondary', 'text-light']
            } 
            else {
                return ['bg-light', 'text-dark']
            }
        },
        linkVariant(idx){
             if (this.tabIndex === idx) {
                return 'light'
            } 
            else {
                return 'secondary'
            }
        }
}
}

</script>
<style>
.tab-element{
    padding-top: 10px;
    padding-bottom: 10px;
    min-height: 66vh;
}


/* not supported in IE, but is anybody still using it? */

.map-container{
    width: 100%;
    height: 100%;
    min-height: 150px
    /* min-height:300px;
    min-width:200px;
    margin-bottom:20px */
}
.info-icons{
    color: #545b62;
    font-size: 0.85rem;
}
</style>