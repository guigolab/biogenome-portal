<template>
    <div ref="cesium"/>
</template>

<script setup>
import DataPortalService from '../services/DataPortalService'
import { onMounted,ref,watch,nextTick } from 'vue';
import * as Cesium from 'cesium';

const props = defineProps({
    geojson:ref(Object)
})
const cesium = ref(null)

const emit = defineEmits(['onEntitySelection'])

var viewer = null

onMounted(()=>{
    cesium.value.focus()
    viewer = new Cesium.Viewer(cesium.value, {timeline:false,infoBox:false,animation:false});
    viewer.selectedEntityChanged.addEventListener(function(selectedEntity) {
        if (Cesium.defined(selectedEntity)) {
            if (Cesium.defined(selectedEntity.name)) {
                // DataPortalService.getCoordinates(selectedEntity.name)
                // .then(resp => {
                //     nextTick(()=>{
                emit('onEntitySelection', {label:'geo_location', value:selectedEntity.name})
                //     })
                // })
            } else {
                emit('onEntitySelection', {label:'geo_location', value:null})
            }
        } else {
            emit('onEntitySelection', {label:'geo_location', value:null})
        }
    })
    updateSource(props.geojson)
})

watch(props.geojson,(newValue, oldValue)=>{
    updateSource(oldValue)
})

function updateSource(geojson){
    const pinBuilder = new Cesium.PinBuilder()
    Cesium.GeoJsonDataSource.load(geojson)
    .then(dataSource => {
        nextTick(()=>{
            // dataSource.clustering.enabled=true
            // dataSource.clustering.pixelRange = 15
            // dataSource.clustering.minimumClusterSize = 5
            // dataSource.clustering.clusterBillboards
            // dataSource.clustering.clusterEvent.addEventListener(function(clusteredEntitities, cluster){
            //     console.log(clusteredEntitities)
            //     cluster.label.show=false
            //     cluster.billboard.id = cluster.label.id;
            //     cluster.billboard.show = true
            //     cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
            //     cluster.billboard.image = pinBuilder.fromText(clusteredEntitities.length, Cesium.Color.BLUEVIOLET, 48).toDataURL()
            // })
            const entities = dataSource.entities.values
            entities.forEach(entity => {
                var attributes = ''
                entity.properties.organisms._value.forEach(organism => {
                    attributes = attributes + `<li><a target="_blank" href="/organisms/${organism.taxid}">${organism.scientific_name}</a></li>`
                })
                entity.description = '<ul>'+attributes+'</ul>'
                entity.billboard.image = pinBuilder.fromText(entity.properties.organisms._value.length, Cesium.Color.BLUEVIOLET, 48).toDataURL()
            })
            viewer.dataSources.add(dataSource)
            viewer.zoomTo(viewer.entities)
        })
    })
}

</script>
