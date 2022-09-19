<template>
    <div ref="cesium"/>
</template>

<script setup>
import { onMounted,ref,watch} from 'vue';
import * as Cesium from 'cesium';
import pin_drop from '../assets/pin.svg'
import countries from '../assets/countries.json'
const accessToken = import.meta.env.VITE_CESIUM_TOKEN

// const props = defineProps({
//     geojson:Object
// })
const cesium = ref(null)

const emit = defineEmits(['onEntitySelection'])

var viewer = null

onMounted(()=>{
    cesium.value.focus()
    Cesium.Ion.defaultAccessToken = accessToken
    viewer = new Cesium.Viewer(cesium.value, {timeline:false,animation:false});
    viewer.selectedEntityChanged.addEventListener(function(selectedEntity) {
        if(Cesium.defined(selectedEntity)) {
            console.log(selectedEntity.name)
            emit('onEntitySelection', selectedEntity.name)
        }else {
            emit('onEntitySelection', null)
        }
    })
    console.log("inside mounted")
    updateSource(countries)
})

// watch(props.geojson,(newValue, oldValue)=>{
//     console.log("inside watch")
//     updateSource(oldValue)
// })

function updateSource(geojson){
    console.log("inside method")
    const pinBuilder = new Cesium.PinBuilder()
    Cesium.GeoJsonDataSource.load(geojson)
    .then(dataSource => {
        const entities = dataSource.entities.values
        console.log(entities)
        viewer.dataSources.add(dataSource)
        // viewer.zoomTo(viewer.entities)
    })
}

</script>
