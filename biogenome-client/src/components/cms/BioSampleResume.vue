<template>
    <VaCard>
        <VaCardContent>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <h2 class="va-h5">
                        Sample Resume
                    </h2>
                    <p class="va-text-secondary">
                        View the resume and submit the sample
                    </p>
                </div>
            </div>
        </VaCardContent>
        <VaDivider style="margin: 0;"/>
        <VaCardContent>
            <p class="va-text-bold">{{ sampleStore.sampleIdentifier }}</p>
            <p class="va-text-secondary">
                Sample identifier
            </p>
        </VaCardContent>
        <VaCardContent>
            <p class="va-text-bold">{{ sampleStore.taxid }}</p>
            <p class="va-text-secondary">
                Taxonomic identifier
            </p>
        </VaCardContent>
        <VaCardContent>
            <p class="va-text-bold">{{ sampleStore.scientificName }}</p>
            <p class="va-text-secondary">
                Scientific name
            </p>
        </VaCardContent>
        <VaCardContent v-for="[k, v] in Object.entries(sampleStore.characterics)">
            <p class="va-text-bold">{{ v }}</p>
            <p class="va-text-secondary">
                {{ k }}
            </p>
        </VaCardContent>
    </VaCard>
</template>

<script setup lang="ts">
import { useSampleStore } from '../../stores/sample-store';

const sampleStore = useSampleStore()


</script>