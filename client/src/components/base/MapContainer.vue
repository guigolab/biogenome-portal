<template>
  <div ref="map-root">
  </div>
</template>

<script>
  import View from 'ol/View'
  import Map from 'ol/Map'
  import TileLayer from 'ol/layer/Tile'
  import OSM from 'ol/source/OSM'
  // import Feature from 'ol/Feature'
  import VectorLayer from 'ol/layer/Vector'
  import VectorSource from 'ol/source/Vector'
  import {Style, Icon} from 'ol/style';
  // import {Point} from 'ol/geom'
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
    watch:{
        geojson(value) {
        // call `updateSource` whenever the input changes as well
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
      createMap(layer){
        return new Map({
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
      },
      createVectorLayer(){
        return new VectorLayer({
          source: new VectorSource(),
          style: new Style({
            image: new Icon({
              anchor: [0.5, 0.5],
              anchorXUnits: "fraction",
              anchorYUnits: "fraction",
              src: "https://upload.wikimedia.org/wikipedia/commons/e/ec/RedDot.svg"
            })
          })
        })
      }
    }
  }
</script>
