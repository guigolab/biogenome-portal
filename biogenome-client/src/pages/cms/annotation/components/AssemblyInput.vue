<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-select searchable :textBy="(option:Record<string,any>) => `${option.assembly_name} (${option.scientific_name})`" valueBy="accession" trackBy="accession"
                label="select assembly" @update:search="handleSearch" v-model="annotationStore.annotationForm.assembly_accession"
                placeholder="search assemblies" :options="assemblies" immediateValidation
                :rules="[(v: Record<string, string>) => v || 'Select an assembly']"></va-select>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAnnotationStore } from '../../../../stores/annotation-store';
import AssemblyService from '../../../../services/clients/AssemblyService'

const annotationStore = useAnnotationStore()
const assemblies = ref<Record<string, any>[]>([])

onMounted(() => {
    if (annotationStore.annotationForm.assembly_accession) {
        const {assembly_accession,assembly_name} = annotationStore.annotationForm
        assemblies.value.push({assembly_accession,assembly_name})
    }
})

async function handleSearch(v: string) {
    const { data } = await AssemblyService.getAssemblies({ filter: v, filter_option: 'scientific_name' })
    if (data.data) assemblies.value = [...data.data]
}

</script>