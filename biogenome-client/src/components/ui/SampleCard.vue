<template>
    <va-card>
        <va-card-content>
            <h6 class="va-h6">
                <router-link style="color: inherit;"
                    :to="selectedSample.is_local_sample ?
                        { name: 'local_sample', params: { id: selectedSample.sample_accession } } : { name: 'biosample', params: { accession: selectedSample.sample_accession } }">
                    {{ selectedSample.sample_accession }}
                </router-link>
            </h6>
            <p class="va-text-secondary">{{ data.scientific_name }}</p>
        </va-card-content>
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
