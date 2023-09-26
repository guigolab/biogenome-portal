<template>
    <div style="height: 100%">
        <LeafletMap :coordinates="coordinates" />
    </div>
</template>
<script setup lang="ts">
import LeafletMap from '../../..//components/maps/LeafletMap.vue';
import { OrganismCoordinates, OrganismLocations } from '../../../data/types';
import TaxonService from '../../../services/clients/TaxonService'
import { ref } from 'vue'


const coordinates = ref([])
const root = import.meta.env.VITE_ROOT_NODE || '131567'
const { data } = await TaxonService.getTaxonCoordinates(root)
coordinates.value = data.reduce((accumulator: OrganismCoordinates[], organism: OrganismLocations) => {
    const tuples: OrganismCoordinates[] = organism.locations.map((location) => {
        return {
            latitude: Number(location[1]),
            longitude: Number(location[0]),
            id: organism.scientific_name,
            taxid: organism.taxid,
            image: organism.image || undefined
        }
    })
    return accumulator.concat(tuples);
}, []); 


</script>