<template>
    <div class="dashboard">
        <h2 class="va-h2">Welcome, {{ userName }}!</h2>
        <p class="light-paragraph mb-12">
            {{ isAdmin ? adminMessage : dataManagerMessage }}
        </p>
        <div class="row aling-end">
            <div class="flex">
                <VaButton color="secondary" icon="home" :to="{ name: 'cms-organisms' }">Organisms </VaButton>
            </div>
            <div class="flex">
                <va-menu :options="uploadOptions" @selected="(v: Record<string, any>) => $router.push(v.value)">
                    <template #anchor>
                        <VaButton color="info">Upload</VaButton>
                    </template>
                </va-menu>
            </div>
            <div class="flex">
                <VaButton color="warning" :to="{ name: 'cms-local_samples' }">Local Samples</VaButton>
            </div>
            <div class="flex">
                <VaButton color="success" :to="{ name: 'create-organism' }">New Organism</VaButton>
            </div>
            <div v-if="isAdmin" class="flex">
                <va-menu :options="adminOptions" @selected="(v: Record<string, any>) => $router.push(v.value)">
                    <template #anchor>
                        <VaButton>Options</VaButton>
                    </template>
                </va-menu>
            </div>
        </div>
        <router-view />
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useGlobalStore } from '../../stores/global-store'

const { userName, userRole } = useGlobalStore()

const uploadOptions = [
    { text: 'Import from INSDC', value: { name: 'insdc-form' }, group: 'INSDC' },
    { text: 'Spreadsheet (samples)', value: { name: 'spreadsheet-upload' }, group: 'Uploads' },
    { text: 'GoaT report ', value: { name: 'goat-upload' }, group: 'Uploads' },
    { text: 'Manage Users', value: { name: 'cms-users' }, group: 'Local Data' },
    { text: 'Create Annotation', value: { name: 'create-annotation' }, group: 'Local Data' },
]

const isAdmin = computed(() => {
    return userRole === 'Admin'
})
const adminMessage = 'Here you can manage all the data contained in the database, import metadata from INSDC, upload GoaT compliant reports, import spreadsheet containing sample metadata, manage users roles and species and add genome annotations '
const dataManagerMessage = 'Here you can manage all your data, upload GoaT compliant reports, import spreadsheet containing sample metadata and manage species metadata such as the GoaT sequencing status, vernacular names and links to photos'
const adminOptions = [
    { text: 'Import from INSDC', value: { name: 'insdc-form' }, group: 'INSDC Data' },
    { text: 'Manage Users', value: { name: 'cms-users' }, group: 'Local Data' },
    { text: 'Create Annotation', value: { name: 'create-annotation' }, group: 'Local Data' },
    { text: 'Annotations', value: { name: 'cms-annotations' }, group: 'Local Data' },
    { text: 'Assemblies', value: { name: 'cms-assemblies' }, group: 'INSDC Data' },
    { text: 'BioSamples', value: { name: 'cms-biosamples' }, group: 'INSDC Data' },
    { text: 'Experiments', value: { name: 'cms-experiments' }, group: 'INSDC Data' },
]


</script>
