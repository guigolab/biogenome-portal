<template>
    <div style="height: 300px" ref="map2d">
      <!-- <div id="popup" ref="olpopup" class="ol-popup">
      <div id="popup-content"></div> -->
    </div>
</template>
<script setup>
import Overlay from 'ol/Overlay';
import View from 'ol/View'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import {Style, Icon} from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON'
import 'ol/ol.css'
import { onMounted, watch,ref, reactive } from 'vue';


const map2d = ref(null)
const olpopup = ref(null)
var olMap = null
var vectorLayer = null

const props = defineProps({
    taxid: String
})

onMounted(()=>{
    map2d.value.focus()
    map3d.value.focus()
    olpopup.value.focus()
    console.log(props.geojson)
    if(props.geojson && props.geojson.features){
        vectorLayer = createLayer()
        olMap = createMap(vectorLayer)
        updateSource(props.geojson)
    }
    // const ol3d = new OLCesium({map: olMap, target: map3d.value}); // olMap is the ol.Map instance
    // ol3d.setEnabled(true);
})

watch(props.geojson,(newValue, oldValue)=>{
    console.log(newValue)
    console.log(oldValue)
    vectorLayer = createLayer()
    olMap = createMap(vectorLayer)
    updateSource(value)
    ol3d.setEnabled(true);
})

function createLayer(){
    return new VectorLayer({
        source: new VectorSource(),
        style: new Style({
            image: new Icon({
            anchor: [0.5, 0.5],
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",
            src: "/red-dot.svg"
            })
        })
    })
}

function createMap(layer){
    const map =  new Map({
        target: map2d.value,
        layers: [
            new TileLayer({source: new OSM()}),
            layer
        ],
        view: new View({center:[0,0],zoom:0})
    })
    // const overlay = new Overlay({
    //     id: 'pop-up',
    //     element: olpopup,
    //     autoPan: {
    //         animation: {
    //         duration: 250,
    //         },
    //     }
    // })
    // map.addOverlay(overlay)
    // map.on('singleclick', function(e){
    // var biosamples = ''
    // this.getFeaturesAtPixel(e.pixel).forEach(ft => {
    //     ft.get('biosamples').forEach(entry => {
    //     biosamples = biosamples+`<a class="ft-map-link" href="#/samples/${entry.accession || entry.tube_or_well_id}">${entry.accession || entry.tube_or_well_id}</a> <a href="#/organisms/${entry.scientific_name}">(${entry.scientific_name})</a><br/>`
    //     })
    // })
    // if(biosamples){
    //     const coordinate = e.coordinate;
    //     document.getElementById('popup').innerHTML = '<div>'+biosamples+'<div>'
    //     this.getOverlayById('pop-up').setPosition(coordinate)
    // }else{
    //     this.getOverlayById('pop-up').setPosition(undefined)
    // }
    // })
    return map
}

function updateSource(geojson) {
    const view = olMap.getView()
    const source = vectorLayer.getSource()
    const features = geojson ? new GeoJSON({featureProjection: 'EPSG:3857'}).readFeatures(geojson) : null
    source.clear()
    if(features){
        source.addFeatures(features);
        // this zooms the view on the created object
        view.fit(source.getExtent(), {
            size: olMap.getSize(),
            maxZoom: 4
        })
    }
}
</script>