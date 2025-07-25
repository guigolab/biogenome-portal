<template>
    <VaCard>
        <VaCardContent>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <h2 class="va-h5">
                        Sample Information
                    </h2>
                    <p class="va-text-secondary">
                        Select the organism and the sample identifier
                    </p>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent>
            <OrganismSelection v-if="showOrganismSelection" @selected="handleSelection" />
            <div v-if="sampleStore.scientificName && sampleStore.taxid" class="row">
                <div class="flex">
                    <VaCard stripe-color="success" stripe>
                        <VaCardTitle>
                            Selected organism
                        </VaCardTitle>
                        <VaCardContent>
                            <h5 class="va-h5">
                                {{ sampleStore.scientificName }}
                            </h5>
                            <p class="va-text-secondary">
                                {{ sampleStore.taxid }}
                            </p>
                        </VaCardContent>
                        <VaCardActions>
                            <VaButton size="small" color="warning" @click="resetOrganismSelection">Change organism</VaButton>
                        </VaCardActions>
                    </VaCard>
                </div>
            </div>
            <div v-if="!sampleStore.scientificName && !sampleStore.taxid" class="row">
                <div class="flex">
                    <p class="va-text-danger va-text-bold">Organism selection is mandatory!</p>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaInput
                        placeholder="Type the sample unique identifier, this will be used internally"
                        v-model="sampleStore.sampleIdentifier"
                        :messages="['This will be used internally to identify the sample']"
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
import { ref, onMounted } from 'vue';

const sampleStore = useSampleStore()
const showOrganismSelection = ref(true)

onMounted(() => {
    showOrganismSelection.value = true
})

function resetOrganismSelection() {
    sampleStore.scientificName = ''
    sampleStore.taxid = ''
    showOrganismSelection.value = true
}

function handleSelection(payload: { scientificName: string, taxId: string }) {
    const { scientificName, taxId } = payload
    sampleStore.scientificName = scientificName
    sampleStore.taxid = taxId
    showOrganismSelection.value = false
}


</script>