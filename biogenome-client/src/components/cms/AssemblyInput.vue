<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaSelect searchable
                :textBy="(option: Record<string, any>) => `${option.accession || option.assembly_accession} (${option.scientific_name})`"
                valueBy="accession" trackBy="accession" label="select assembly" @update:search="handleSearch"
                v-model="annotationStore.annotationForm.assembly_accession" placeholder="search assemblies"
                :options="assemblies" immediateValidation></VaSelect>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useAnnotationStore } from '../../stores/annotation-store';
import CommonService from '../../services/CommonService';

const annotationStore = useAnnotationStore()
const assemblies = ref<Record<string, any>[]>([])

async function handleSearch(v: string) {
    const { data } = await CommonService.getItems('assemblies', { filter: v })
    if (data.data) assemblies.value = [...data.data]
}

</script>