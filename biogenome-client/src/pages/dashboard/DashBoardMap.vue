<template>
    <div style="height: 100%"  v-if="coordinates.length">
        <LeafletMap :coordinates="coordinates"/>
    </div>
</template>
<script setup lang="ts">
import LeafletMap from '../../components/maps/LeafletMap.vue';
import TaxonService from '../../services/clients/TaxonService'
import {ref,onMounted} from 'vue'
const coordinates =  ref([])

const root = import.meta.env.VITE_ROOT_NODE
onMounted(async() =>{
    await getCoordinates()
})
async function getCoordinates() {
        const {data} = await TaxonService.getTaxonCoordinates(root)
        data.forEach(organism => {
            organism.locations.forEach(location => {
                const lng = location[0]
                const lat = location[1]
                const value = {
                    latitude: Number(lat),
                    longitude: Number(lng),
                    id: organism.scientific_name,
                    taxid: organism.taxid
                }
                if(organism.image){
                    value.image = organism.image
                }
                coordinates.value.push(value)
            })
        })
    }
</script>