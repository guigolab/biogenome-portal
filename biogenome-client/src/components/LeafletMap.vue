<template>
    <ChoroplethMap v-if="mapType === 'cloropleth'" :countries="countries" :selectedCountries="selectedCountries"
        @countrySelected="(country) => emits('countrySelected', country)" />
    <LocationsMap v-else :locations="locations" :interactionDisabled="interactionDisabled" />
</template>

<script setup lang="ts">
import ChoroplethMap from './ChoroplethMap.vue'
import LocationsMap from './LocationsMap.vue'

const props = defineProps<{
    mapType: 'cloropleth' | 'points',
    locations: Record<string, any>[]
    countries: Record<string, any>[]
    selectedCountries: Record<string, any>[],
    interactionDisabled?: boolean
}>()

const emits = defineEmits(['countrySelected'])
</script>

<style>
.map-container {
    position: relative;
    z-index: 100;
}

.leaflet-map {
    height: 400px;
    width: 100%;
    z-index: 99;
}

.legend {
    display: grid;
    line-height: 18px;
    color: #555;
}

.legend i {
    width: 18px;
    height: 18px;
    float: left;
    margin-right: 8px;
    opacity: 0.7;
}

.info {
    padding: 6px 8px;
    font: 14px/16px Arial, Helvetica, sans-serif;
    background: white;
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    border-radius: 5px;
}

.info h4 {
    margin: 0 0 5px;
    color: #777;
}
</style>