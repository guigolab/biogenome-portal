<template>
    <va-card class="row justify-space-between align-center">
        <div class="flex">
            <h6 class="va-h6">
                <router-link style="color: inherit;"
                    :to="selectedSample.is_local_sample ?
                        { name: 'local_sample', params: { id: selectedSample.sample_accession } } : { name: 'biosample', params: { accession: selectedSample.sample_accession } }">
                    {{ selectedSample.sample_accession }}
                </router-link>
            </h6>
            <p class="va-text-secondary">{{ data.scientific_name }}</p>
        </div>
        <div class="flex">
            <va-button-actions vertical align="between">
                <va-button preset="plain" size="small" v-if="data.assemblies.length" icon="fa-dna" color="background-tertiary" />
                <va-button preset="plain" size="small" v-if="data.experiments.length" icon="fa-file-lines" color="background-tertiary" />
            </va-button-actions>
        </div>
    </va-card>
</template>
<script setup lang="ts">
import BioSampleService from '../../services/clients/BioSampleService'
import LocalSampleService from '../../services/clients/LocalSampleService'

const props = defineProps<{
    selectedSample: {
        sample_accession: string
        is_local_sample: boolean
        image?: string
    }
}>()

const { data } = props.selectedSample.is_local_sample ?
    await LocalSampleService.getLocalSample(props.selectedSample.sample_accession) :
    await BioSampleService.getBioSample(props.selectedSample.sample_accession)

</script>
<style>
.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    /* Adjust column width as needed */
    gap: 20px;
    /* Adjust the gap between cards as needed */
    justify-content: center;
    /* Center the grid horizontally */
}
</style>
