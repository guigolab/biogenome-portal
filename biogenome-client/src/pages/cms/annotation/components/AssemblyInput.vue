<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-select searchable
                :textBy="(option: Record<string, any>) => `${option.accession || option.assembly_accession} (${option.scientific_name})`"
                valueBy="accession" trackBy="accession" label="select assembly" @update:search="handleSearch"
                v-model="annotationStore.annotationForm.assembly_accession" placeholder="search assemblies"
                :options="assemblies" immediateValidation></va-select>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useAnnotationStore } from '../../../../stores/annotation-store';
import AssemblyService from '../../../../services/clients/AssemblyService'

const annotationStore = useAnnotationStore()
const assemblies = ref<Record<string, any>[]>([])

async function handleSearch(v: string) {
    const { data } = await AssemblyService.getAssemblies({ filter: v })
    if (data.data) assemblies.value = [...data.data]
}

</script>