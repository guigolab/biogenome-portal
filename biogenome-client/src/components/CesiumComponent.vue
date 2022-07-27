<template>
    <div ref="cesium"/>
</template>

<script setup>
import { onMounted,ref,watch} from 'vue';
import * as Cesium from 'cesium';
import pin_drop from '../assets/pin.svg'

const accessToken = import.meta.env.VITE_CESIUM_TOKEN

const props = defineProps({
    geojson:ref(Object)
})
const cesium = ref(null)

const emit = defineEmits(['onEntitySelection'])

var viewer = null

onMounted(()=>{
    cesium.value.focus()
    Cesium.Ion.defaultAccessToken = accessToken
    viewer = new Cesium.Viewer(cesium.value, {timeline:false,animation:false,infoBox:false});
    viewer.selectedEntityChanged.addEventListener(function(selectedEntity) {
        if(Cesium.defined(selectedEntity) && Cesium.defined(selectedEntity.name)) {
            emit('onEntitySelection', {label:'geo_location', value:selectedEntity.name})
        }else {
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
        const entities = dataSource.entities.values
        entities.forEach(entity => {
            entity.billboard.image = pin_drop
        })
        viewer.dataSources.add(dataSource)
        viewer.zoomTo(viewer.entities)
    })
}

</script>
