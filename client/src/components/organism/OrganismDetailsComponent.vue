<template>
<b-container class="router-container" fluid>
    <b-row>
        <b-col v-if="validRecords.length > 0" lg="5">
            <b-row class="map-container">
                <map-container :geojson="geojson"/>
            </b-row>
        </b-col>
        <b-col>
            <b-row>
                <b-col>
                    <div style="display:flex;width:fit-content;">
                        <h2 style="margin-bottom:0px">{{organism.organism}}</h2>
                        <div style="margin-left: 10px;margin-right:10px;">
                            <status-badge-component :status="organism.trackingSystem"/>
                        </div>
                    </div>
                </b-col>
            </b-row>
            <b-row>
                <b-col style="font-size: 0.85rem">
                    <b-link v-for="node in reverseItems(organism.taxon_lineage)" :key="node.taxid" 
                    :to="{name: 'tree-of-life', params: {node: node.name}}"
                    >
                        {{node.name}} (<strong>{{node.rank}}</strong>)
                    </b-link>
                </b-col>
            </b-row>
            <b-row>
                <b-col>
                    <b-badge style="margin-right:5px" variant='info' pill><strong>{{organism.taxid}}</strong></b-badge>
                    <b-badge style="margin-right:5px" pill variant='dark' target="_blank" :href="'https://goat.genomehubs.org/records?record_id='+organism.taxid+'&result=taxon&taxonomy=ncbi#'+organism.organism">GoaT</b-badge>
                    <b-badge style="margin-right:5px" pill target="_blank" :href="'https://www.ebi.ac.uk/ena/browser/view/'+ organism.taxid">ENA</b-badge>
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
                <b-tab :title-link-class="linkClass(0)" active class="tab-element" lazy>
                    <template #title>
                        <strong>Samples  </strong><b-badge :variant="linkVariant(0)" pill>{{organism.records.length}}</b-badge>
                    </template>
                    <sample-component :samples="organism.records"/>
                </b-tab>
                <b-tab :title-link-class="linkClass(1)" class="tab-element" v-if="organism.assemblies && organism.assemblies.length" lazy>
                    <template #title>
                        <strong>Assemblies  </strong><b-badge :variant="linkVariant(1)" pill>{{organism.assemblies.length}}</b-badge>
                    </template>
                    <assemblies-component :assemblies="organism.assemblies"/>
                </b-tab>
                <b-tab :title-link-class="linkClass(expIndex)" class="tab-element"  v-if="organism.experiments && organism.experiments.length" lazy>
                    <template #title>
                        <strong>Experiments  </strong><b-badge :variant="linkVariant(expIndex)" pill>{{organism.experiments.length}}</b-badge>
                    </template>
                    <experiments-component :experiments="organism.experiments"/>
                </b-tab>
            </b-tabs>
        </b-col>
    </b-row>
</b-container>
</template>

<script>
import {BTabs,BLink,BTab,BBadge,} from 'bootstrap-vue'
import StatusBadgeComponent from '../base/StatusBadgeComponent.vue'
import MapContainer from '../base/MapContainer.vue'
import ExperimentsComponent from '../ExperimentsComponent.vue'
import AssembliesComponent from '../AssembliesComponent.vue'
import SampleComponent from '../sample/SampleComponent.vue'
export default {
    components: {BTabs, ExperimentsComponent,BTab, BLink, BBadge, StatusBadgeComponent, MapContainer, AssembliesComponent, SampleComponent},
    props:['organism'],
    computed:{
        expIndex(){
            if(this.haveItems(this.organism.assemblies)){
                return 2
            }
            return 1
        },
        validRecords(){
            return this.organism.records.filter(record => 
            record.geographic_location_longitude 
            && record.geographic_location_latitude 
            && record.geographic_location_longitude.text 
            && record.geographic_location_latitude.text
            && !isNaN(record.geographic_location_latitude.text) && !isNaN(record.geographic_location_longitude.text))
        }
    },
    data(){
        return {
            geojson:null,
            tabIndex:0,
            mapKey: 0
        }
    },
    mounted(){
        if(this.validRecords.length > 0){
            this.createGeoJson()
        }
       
    },
    methods: {
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
            this.validRecords.forEach(record => {
                const feature = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [record.geographic_location_longitude.text, record.geographic_location_latitude.text]
                    }
                }
                geoJson.features.push(feature)
            })
            this.geojson = geoJson
                  
        },
        reverseItems(items) {
            return items.slice().reverse();
        },
        haveItems(arr){
            return arr && arr.length > 0
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

.map-container{
    width: 100%;
    height: 100%;
    min-height: 150px
    /* min-height:300px;
    min-width:200px;
    margin-bottom:20px */
}
/* not supported in IE, but is anybody still using it? */

</style>