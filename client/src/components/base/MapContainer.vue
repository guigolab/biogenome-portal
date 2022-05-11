<template>
  <div ref="map-root">
      <div id="popup" ref="olpopup" class="ol-popup">
      <div id="popup-content"></div>
      </div>
  </div>
</template>

<script>
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


export default {
  name: 'MapContainer',
  props:['geojson'],
  components: {},
  data(){
    return {
        olMap: null,
        vectorLayer: null,
        vectorSource: null,
    }
  },
  mounted(){
    if(this.geojson){
      this.vectorLayer = this.createVectorLayer()
      this.olMap = this.createMap(this.vectorLayer)
      this.updateSource(this.geojson)
    }
  },
  watch:{
      geojson(value) {
      console.log(value)
      this.vectorLayer = this.createVectorLayer()
      this.olMap = this.createMap(this.vectorLayer)
      this.updateSource(value)
    }
  },
  methods: {
      updateSource(geojson) {
      const view = this.olMap.getView()
      const source = this.vectorLayer.getSource()
      const features = new GeoJSON({
        featureProjection: 'EPSG:3857',
      }).readFeatures(geojson)
      source.clear();
      source.addFeatures(features);
      // this zooms the view on the created object
      view.fit(source.getExtent(), {
        size: this.olMap.getSize(),
        maxZoom: 4
      });
    },
    closePopup(){
      this.overlay.setPosition(undefined)
      this.$refs.popupcloser.blur()
    },
    // onSelect(){
    //   this.selectClick.on('select', function(e){
    //     console.log(e)
    //   })
    // },
    createMap(layer){
      const map =  new Map({
      // the map will be created using the 'map-root' ref
        target: this.$refs['map-root'],
        layers: [
          // adding a background tiled layer
          new TileLayer({
            source: new OSM() // tiles are served by OpenStreetMap
          }),
          layer
        ],
      // the map view will initially show the whole world
        view: new View({center:[0,0],zoom:0})
      })
      const overlay = new Overlay({
        id: 'pop-up',
        element: this.$refs.olpopup,
        autoPan: {
          animation: {
            duration: 250,
          },
        },
      })
      map.addOverlay(overlay)
      map.on('singleclick', function(e){
        var biosamples = ''
        this.getFeaturesAtPixel(e.pixel).forEach(ft => {
          ft.get('biosamples').forEach(sample => {
            biosamples = biosamples+`<a href="#/samples/${sample}">${sample}</a><br/>`
          })
        })
        if(biosamples){
          const coordinate = e.coordinate;
          document.getElementById('popup').innerHTML = '<div>'+biosamples+'<div>'
          this.getOverlayById('pop-up').setPosition(coordinate)
        }else{
          this.getOverlayById('pop-up').setPosition(undefined)
        }

          // content.innerHTML = '<p>You clicked here:</p><code>' + hdms + '</code>';
          // this.overlay.setPosition(coordinate);
      })
      return map
    },
    createVectorLayer(){
      const vectorLayer = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
            image: new Icon({
            // size:[10,10],
            // scale: 0.5,
            anchor: [0.5, 0.5],
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",
            src: "/red-dot.svg"
          })
        })
      })
      return vectorLayer
  }
}
}
</script>
<style scoped>
.ol-popup {
  position: absolute;
  overflow: scroll;
  background-color: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #cccccc;
  bottom: 12px;
  left: -50px;
  max-height:200px;
}
/* .ol-popup:after, .ol-popup:before {
  top: 100%;
  border: solid transparent;
  content: " ";
  height: 0;
  width: 0;
  position: absolute;
  pointer-events: none;
}
.ol-popup:after {
  border-top-color: white;
  border-width: 10px;
  left: 48px;
  margin-left: -10px;
}
.ol-popup:before {
  border-top-color: #cccccc;
  border-width: 11px;
  left: 48px;
  margin-left: -11px;
}
.ol-popup-closer {
  text-decoration: none;
  position: absolute;
  top: 2px;
  right: 8px;
}
.ol-popup-closer:after {
  content: "✖";
} */
</style>