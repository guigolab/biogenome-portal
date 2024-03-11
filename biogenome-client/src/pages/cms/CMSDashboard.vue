<template>
    <div class="dashboard">
        <h2 class="va-h2">Welcome, {{ userName }}!</h2>
        <p> {{ isAdmin ? adminMessage : dataManagerMessage }} </p>
        <va-divider />
        <div class="row aling-end">
            <div class="flex">
                <VaButton  color="secondary" icon="home" :to="{ name: 'cms-organisms' }"></VaButton>
            </div>
            <div class="flex">
                <va-menu :options="uploadOptions" @selected="(v: Record<string, any>) => $router.push(v.value)">
                    <template #anchor>
                        <VaButton  color="info">Upload</VaButton>
                    </template>
                </va-menu>
            </div>
            <div class="flex">
                <VaButton  color="warning" :to="{ name: 'cms-local_samples' }">Local Samples</VaButton>
            </div>
            <div class="flex">
                <VaButton  color="success" :to="{ name: 'create-organism' }">New Organism</VaButton>
            </div>
            <div v-if="isAdmin" class="flex">
                <va-menu :options="adminOptions" @selected="(v: Record<string, any>) => $router.push(v.value)">
                    <template #anchor>
                        <VaButton >Options</VaButton>
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
import { useRouter } from 'vue-router'

const router = useRouter()
const { userName, userRole } = useGlobalStore()
const uploadOptions = [
    { text: 'Spreadsheet (samples)', value: { name: 'spreadsheet-upload' } },
    { text: 'GoaT report ', value: { name: 'goat-upload' } },
]

const isAdmin = computed(() => {
    return userRole === 'Admin'
})

const adminMessage = 'Here you can manage all the data contained in the database, import metadata from INSDC, upload GoaT compliant reports, import spreadsheet containing sample metadata, manage users roles and species and add genome annotations '
const dataManagerMessage = 'Here you can manage all your data, upload GoaT compliant reports, import spreadsheet containing sample metadata and add manage species metadata such as the GoaT sequencing status, vernacular names and links to photos'
const adminOptions = [
    { text: 'Import from INSDC', value: { name: 'insdc-form' }, group: 'INSDC' },
    { text: 'Manage Users', value: { name: 'cms-users' }, group: 'Users' },
    { text: 'Create Annotation', value: { name: 'create-annotation' }, group: 'Local' },
    { text: 'Annotations', value: { name: 'cms-annotations' }, group: 'Local' },
    { text: 'Assemblies', value: { name: 'cms-assemblies' }, group: 'INSDC' },
    { text: 'BioSamples', value: { name: 'cms-biosamples' }, group: 'INSDC' },
    { text: 'Experiments', value: { name: 'cms-experiments' }, group: 'INSDC' },
]


</script>
<style lang="scss">
.row-equal .flex {
    .va-card {
        height: 100%;
    }
}

.dashboard {
    .va-card {
        margin-bottom: 0 !important;

        &__title {
            display: flex;
            justify-content: space-between;
        }
    }
}

.chart {
    height: 400px;
}
</style>