<template>
    <va-card style="height: 150px;">
        <va-card-content>
            <div class="row justify-space-between align-center">
                <div v-if="selectedSample.image" style="margin: 0;padding: 0;" class="flex">
                    <img :src="selectedSample.image" />
                </div>
                <div class="flex">
                    <h6 class="va-h6" style="word-wrap:break-word ;">
                        <router-link
                            style="color: inherit;"
                            :to="selectedSample.is_local_sample ?
                                { name: 'local_sample', params: { id: selectedSample.sample_accession } } : { name: 'biosample', params: { accession: selectedSample.sample_accession } }">
                            {{ selectedSample.sample_accession }}
                        </router-link>
                    </h6>
                    <p class="va-text-secondary">{{ data.scientific_name }}</p>
                </div>
                <div class="flex">
                    <va-icon v-if="data.sub_samples.length" name="fa-vial" color="background-tertiary" />
                    <va-icon v-if="data.assemblies.length" name="fa-dna" color="background-tertiary" />
                    <va-icon v-if="data.experiments.length" name="fa-file-lines" color="background-tertiary" />
                </div>
            </div>
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
