<template>
    <div ref="cesium"/>
</template>

<script setup>
import { nextTick, onMounted,ref,watch} from 'vue';
import * as Cesium from 'cesium';
import pin_drop from '../assets/pin.svg'

const accessToken = import.meta.env.VITE_CESIUM_TOKEN
const props = defineProps({
    geojson:Object,
    counter:Number
})
const cesium = ref(null)

const emit = defineEmits(['onEntitySelection'])

var viewer = null
var source = new Cesium.GeoJsonDataSource()

onMounted(()=>{
    cesium.value.focus()
    if(accessToken){
        Cesium.Ion.defaultAccessToken = accessToken
    }
    viewer = new Cesium.Viewer(cesium.value, {timeline:false,animation:false,infoBox:false});
    viewer.selectedEntityChanged.addEventListener(function(selectedEntity) {
        if(Cesium.defined(selectedEntity)) {
            emit('onEntitySelection', selectedEntity.name)
        }else {
            emit('onEntitySelection', null)
        }
    })
    viewer.dataSources.add(source)
    updateSource(props.geojson)
})

watch(()=>props.counter,
    (value)=>{
    updateSource(props.geojson)
})

function updateSource(geojson){
    source.entities.removeAll()
    const pinBuilder = new Cesium.PinBuilder()
    source.load(geojson)
    .then(dataSource => {
        nextTick(()=>{
            const entities = dataSource.entities.values
            entities.forEach(entity => {
                entity.billboard.image = pin_drop
            })
            viewer.zoomTo(viewer.entities)
        })

    })
}

</script>
