<template>
    <div class="row align-center">
        <div class="flex">
            <VaInput class="mw-250" preset="bordered" @keyup.enter="search" inner-label v-model="filter"
                :label="t('buttons.search')" placeholder="Search by name or accession">
                <template #appendInner>
                    <VaIcon name="search" />
                </template>
            </VaInput>
        </div>
        <div v-if="showSampleTypeSelect" class="flex">
            <VaSelect preset="bordered" inner-label v-model="sampleType" label="Sample Type"
                :options="['local_sample', 'biosample']" />
        </div>
        <div class="flex">
            <VaButton :loading="isLoading" :disabled="isSubmitDisabled" :round="false" @click="search">
                Submit
            </VaButton>
        </div>
        <div class="flex">
            <VaButton :loading="isLoading" :disabled="isSubmitDisabled" :round="false" @click="reset" color="danger">
                Reset
            </VaButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps<{
    lineage?: string,
    taxid?: string,
    sample_accession?: string
}>()

const hasLocalSamples = computed(() => {
    return 'local_samples' in pages
})
const hasBioSamples = computed(() => {
    return 'biosamples' in pages
})

// Computed properties for conditions
const showSampleTypeSelect = computed(() => !props.sample_accession && (hasLocalSamples.value && hasBioSamples.value));

// Disable button logic
const isSubmitDisabled = computed(() => {
    return !filter.value && !sampleType.value
});


async function search() {
    isLoading.value = true
    await iterateCoordinates(0, { filter: filter.value, sample_type: sampleType.value })
}

const filter = ref('')
const sampleType = ref('')
const isLoading = ref(false)


</script>
<style>
.organism-avatar {
    border-radius: 25%;
}

.leaflet-popup-content {
    margin: 0 !important;
}

.container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.controls {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
    align-items: center;
}

/* .control-item {
    flex: 1 1 auto;
    max-width: 250px;
  } */

.map-container {
    flex: 1;
    position: relative;
    z-index: 100;
}

.leaflet-map {
    height: 100%;
    width: 100%;
    z-index: 99;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.spinner {
    border: 12px solid #f3f3f3;
    /* Light grey */
    border-top: 12px solid #3498db;
    /* Blue */
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>