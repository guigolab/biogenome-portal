<template>
    <LeafletMap :coordinates="coordinates"/>
</template>
<script setup lang="ts">
import LeafletMap from '../../components/maps/LeafletMap.vue';
import OrganismService from '../../services/clients/OrganismService';


const coordinates =  await getCoordinates()



async function getCoordinates() {
        const coordinates = []
        const {data} = await OrganismService.getOrganismsLocations()
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
                coordinates.push(value)
            })
        })
        return coordinates

    }
</script>