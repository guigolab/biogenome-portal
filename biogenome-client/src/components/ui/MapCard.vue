<template>
    <div v-if="noLocations">
        <va-card stripe stripe-color="warning">
            <va-card-content>
                Geographic locations not found
            </va-card-content>
        </va-card>
    </div>
    <div v-else style="height: 100%">
        <LeafletMap :coordinates="coordinates" />
    </div>
</template>
<script setup lang="ts">
import LeafletMap from '../../components/maps/LeafletMap.vue';
import { SampleLocations } from '../../data/types';
import GeoLocationService from '../../services/clients/GeoLocationService'

import { ref, } from 'vue'

const noLocations = ref(false)
const callbackObj: Record<string, any> =
{
    'organism': GeoLocationService.getLocationsByOrganims,
    'taxon': GeoLocationService.getLocationsByTaxon,
    'biosample': GeoLocationService.getLocationsByBioSample,
    'local_sample': GeoLocationService.getLocationsByLocalSample
}

const coordinates = ref<SampleLocations[]>([])
const props = defineProps({
    id: {
        type: String,
        default: import.meta.env.VITE_ROOT_NODE || '131567',
        required: true
    },
    model: {
        type: String,
        default: 'taxon',
        required: true
    },
})

const { data } = await callbackObj[props.model](props.id)
coordinates.value = [...data]
if (!coordinates.value.length) noLocations.value = true





</script>