<template>
    <VaLayout :top="{ fixed: true, order: 3 }">
        <template #top>
            <VaNavbar shadowed>
                <template #left>
                    {{ userName }}
                </template>
                <template #right>
                    <VaChip flat :to="'/'">Home</VaChip>
                    <VaMenu :options="importOptions" @selected="(v: Record<string, any>) => $router.push(v.value)">
                        <template #anchor>
                            <VaChip flat>Import</VaChip>
                        </template>
                    </VaMenu>
                    <VaMenu :options="dataOptions" @selected="(v: Record<string, any>) => $router.push(v.value)">
                        <template #anchor>
                            <VaChip flat>Data</VaChip>
                        </template>
                    </VaMenu>
                    <VaChip flat @click="logoutUser">Logout</VaChip>
                </template>
            </VaNavbar>
        </template>
        <template #content>
            <main>
                <div class="layout va-gutter-5">
                    <router-view></router-view>
                </div>
            </main>
        </template>
    </VaLayout>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useGlobalStore } from '../stores/global-store'
import { useRouter } from 'vue-router';

const router = useRouter()
const { userName, userRole, logout } = useGlobalStore()

const isAdmin = computed(() => {
    return userRole === 'Admin'
})

const uploadOptions = [
    { text: 'Spreadsheet (samples)', value: { name: 'spreadsheet-upload' }, group: 'Uploads' },
    { text: 'GoaT report ', value: { name: 'goat-upload' }, group: 'Uploads' },
]

const adminUploadOpts = [
    { text: 'Import from INSDC', value: { name: 'insdc-form' }, group: 'INSDC Data' },
    { text: 'Create Annotation', value: { name: 'create-annotation' }, group: 'Local Data' },
    { text: 'Create Organism', value: { name: 'create-organism' }, group: 'Local Data' },
    { text: 'Create User', value: { name: 'create-user' }, group: 'Local Data' },
]

const importOptions = computed(() => isAdmin.value ? [...uploadOptions, ...adminUploadOpts] : [...uploadOptions])



const defaultDataOpts = [
    { text: 'Organisms', value: { name: 'items', params: { model: 'organisms' } }, group: 'Local Data' },
    { text: 'Local Samples', value: { name: 'items', params: { model: 'local_samples' } }, group: 'Local Data' },
]

const adminDataOptions = [
    { text: 'Users', value: { name: 'users' }, group: 'Local Data' },
    { text: 'Annotations', value: { name: 'items', params: { model: 'annotations' }  }, group: 'Local Data' },
    { text: 'Assemblies', value: { name: 'items' , params: { model: 'assemblies' } }, group: 'INSDC Data' },
    { text: 'BioSamples', value: { name: 'items' , params: { model: 'biosamples' } }, group: 'INSDC Data' },
    { text: 'Experiments', value: { name: 'items' , params: { model: 'experiments' } }, group: 'INSDC Data' },
]

const dataOptions = computed(() => isAdmin.value ? [...defaultDataOpts, ...adminDataOptions] : [...defaultDataOpts])


async function logoutUser() {
    await logout()
    router.push({ 'name': 'login' })

}

</script>