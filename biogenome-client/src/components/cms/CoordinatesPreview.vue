<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <h3 class="va-h5">
                        Coordinates Validation
                    </h3>
                    <p class="va-text-secondary">
                        Select the fields related to the sample coordinates if presents, if you update the fields value
                        you must create another map overview to see the changes
                    </p>
                </VaCardContent>
                <VaCardContent>
                    <div class="row align-end">
                        <div class="flex lg4 md5">
                            <VaSelect label="latitude" v-model="latitudeField" :options="sampleFields"></VaSelect>
                        </div>
                        <div class="flex lg4 md5">
                            <VaSelect label="longitude" v-model="longitudeField" :options="sampleFields"></VaSelect>
                        </div>
                        <div class="flex">
                            <VaButton :disabled="isDisabled" @click="createMap">See in
                                Map</VaButton>
                        </div>
                    </div>
                    <VaCard v-for="loc, idx in locations" square outlined>
                        <VaCardContent>
                            <div class="row align-center">
                                <div class="flex">
                                    <span class="va-text-bold">Latitude:</span> {{
                                        loc.coordinates[1] }}
                                </div>
                                <div class="flex">
                                    <span class="va-text-bold">Longitude:</span> {{
                                        loc.coordinates[0] }}
                                </div>
                                <div class="flex">
                                    <VaButton @click="locations.splice(idx, 1)" color="danger">Delete view
                                    </VaButton>
                                </div>
                            </div>
                        </VaCardContent>
                        <VaCardContent>
                            <div class="row">
                                <div class="flex lg12 md12 sm12 xs12">
                                    <LeafletMap :locations="[loc]" :map-type="'points'" :countries="[]"
                                        :selected-countries="[]" />
                                </div>
                            </div>
                        </VaCardContent>
                    </VaCard>
                </VaCardContent>
            </VaCard>
        </div>
    </div>

</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import LeafletMap from '../LeafletMap.vue';
import { useSampleStore } from '../../stores/sample-store';

const sampleStore = useSampleStore()

const longitudeField = ref('')
const latitudeField = ref('')

const locations = ref<any[]>([])

const sampleFields = computed(() => Object.keys(sampleStore.characterics))
const isDisabled = computed(() => !latitudeField.value && !longitudeField.value)

function createMap() {

    const long = parseFloat(sampleStore.characterics[longitudeField.value])
    const lat = parseFloat(sampleStore.characterics[latitudeField.value])

    const location = {
        taxid: sampleStore.taxid,
        scientific_name: sampleStore.scientificName,
        sample_accession: sampleStore.sampleIdentifier,
        coordinates: [long, lat],
        is_local_sample: true
    }
    locations.value.push(location)
}

</script>