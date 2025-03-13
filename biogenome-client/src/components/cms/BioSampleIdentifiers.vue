<template>
    <VaCard>
        <VaCardContent>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <h2 class="va-h5">
                        Sample Information
                    </h2>
                    <p class="va-text-secondary">
                        Fill the taxonomic information and the sample identifier
                    </p>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent>
            <OrganismSelection :is-organism-creation="false" @selected="handleSelection" />
            <p class="va-text-danger va-text-bold" v-if="!sampleStore.scientificName">Organism selection is mandatory!</p>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaInput label="sample identifier"
                        placeholder="Type the sample unique identifier, this will be used internally"
                        v-model="sampleStore.sampleIdentifier"
                        :rules="[(v: string) => !!v || 'Sample identifier is mandatory']">
                    </VaInput>
                </div>
                <VaInput style="visibility: hidden;" v-model="sampleStore.scientificName" :rules="[(v: string) => !!v]">
                </VaInput>
            </div>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { useSampleStore } from '../../stores/sample-store';
import OrganismSelection from './OrganismSelection.vue';

const sampleStore = useSampleStore()

function handleSelection(payload: { scientificName: string, taxid: string }) {
    const { scientificName, taxid } = payload
    sampleStore.scientificName = scientificName
    sampleStore.taxid = taxid
}


</script>