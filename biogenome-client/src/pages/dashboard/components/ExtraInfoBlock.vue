<template>
    <div class="row row-equal">
        <div class="flex lg6 md6 sm12 xs12">
            <Suspense>
                <IndentedTreeCard />
                <template #fallback>
                    <va-skeleton height="400px" />
                </template>
            </Suspense>
        </div>
        <div v-if="coordinates.length" class="flex lg6 md6 sm12 xs12 c-h">
            <LeafletMap :coordinates="coordinates" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { SampleLocations } from '../../../data/types';
import GeoLocationService from '../../../services/clients/GeoLocationService'
import LeafletMap from '../../../components/maps/LeafletMap.vue'
import IndentedTreeCard from './IndentedTreeCard.vue';

const root = import.meta.env.VITE_ROOT_NODE || '131567'


const coordinates = ref<SampleLocations[]>([])


onMounted(async () => {
    await getCoordinates(root)
})

async function getCoordinates(taxid: string) {
    const { data } = await GeoLocationService.getLocationsByTaxon(taxid)
    coordinates.value = [...data]
}



</script>