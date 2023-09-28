<template>
    <va-card style="height:100%" :to="selectedSample.is_local_sample ?
        { name: 'biosample', params: { accession: selectedSample.sample_accession }} : 
        { name: 'local_sample', params: { id: selectedSample.sample_accession }}">
        <div>
            <img :src=" selectedSample.image " />
        </div>
        <div>
            <h6 class="va-h6" style="word-wrap:break-word ;">{{ selectedSample.sample_accession }}</h6>
            <p>{{ data.scientific_name }}</p>
            <div v-if=" !selectedSample.is_local_sample ">
                <va-icon class="ml-4" v-if=" data.sub_samples.length " name="fa-vial" color="background-tertiary" />
                <va-icon class="ml-4" v-if=" data.assemblies.length " name="fa-dna" color="background-tertiary" />
                <va-icon class="ml-4" v-if=" data.experiments.length " name="fa-file-lines" color="background-tertiary" />
            </div>
        </div>
    </va-card>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BioSampleService from '../../services/clients/BioSampleService'
import LocalSampleService from '../../services/clients/LocalSampleService'
const { t } = useI18n()

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
.w-100 {
    width: 100px;
}
</style>