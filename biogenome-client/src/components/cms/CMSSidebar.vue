<template>
    <VaSidebar activeColor="textPrimary" v-model="globalStore.adminSidebar">
        <VaSidebarItem :to="{ name: 'admin' }">
            <VaSidebarItemContent>
                <VaIcon name="dashboard" />
                <VaSidebarItemTitle>
                    Dashboard
                </VaSidebarItemTitle>
            </VaSidebarItemContent>
        </VaSidebarItem>
        <VaAccordion>
            <VaCollapse>
                <template #header="{ value: isCollapsed }">
                    <VaSidebarItem>
                        <VaSidebarItemContent>
                            <VaIcon name="fa-pen-to-square" />
                            <VaSidebarItemTitle>Forms</VaSidebarItemTitle>
                            <VaSpacer />
                            <VaIcon :name="isCollapsed ? 'va-arrow-up' : 'va-arrow-down'" />
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                </template>
                <template #body>
                    <VaSidebarItem :to="{ name: 'create-organism' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                Create New Organism
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                    <VaSidebarItem v-if="hasENATemplate" :to="{ name: 'publish-biosample' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                Create New Biosample
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                    <VaSidebarItem v-for="action in adminActions" :to="action.value">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                {{ action.text }}
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                </template>
            </VaCollapse>
        </VaAccordion>
        <VaAccordion>
            <VaCollapse>
                <template #header="{ value: isCollapsed }">
                    <VaSidebarItem>
                        <VaSidebarItemContent>
                            <VaIcon name="fa-database" />
                            <VaSidebarItemTitle>Data</VaSidebarItemTitle>
                            <VaSpacer />
                            <VaIcon :name="isCollapsed ? 'va-arrow-up' : 'va-arrow-down'" />
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                </template>
                <template #body>
                    <VaSidebarItem v-if="hasENATemplate" :to="{ name: 'submitted-biosamples' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                {{ isAdmin ? 'Submitted Biosamples' : 'My BioSamples' }}
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                    <VaSidebarItem class="va-text-capitalize" v-for="stat in stats"
                        :to="{ name: 'cms-items', params: { model: stat.key } }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                <span v-if="!isAdmin">My</span> {{ stat.key.split('_').join(' ') }}
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                    <VaSidebarItem v-if="isAdmin" :to="{ name: 'delete-requests' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                Organism Deletion Requests
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                    <VaSidebarItem v-if="isAdmin" :to="{ name: 'organisms-with-users' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                Organisms & Users
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                    <VaSidebarItem v-if="isAdmin" :to="{ name: 'users' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                Users
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                </template>
            </VaCollapse>
        </VaAccordion>
        <VaSpacer />
        <VaSidebarItem :to="{ name: 'home' }">
            <VaSidebarItemContent>
                <VaIcon name="fa-arrow-left"></VaIcon>
                <VaSidebarItemTitle>
                    Back to Home
                </VaSidebarItemTitle>
            </VaSidebarItemContent>
        </VaSidebarItem>
    </VaSidebar>
</template>
<script setup lang="ts">
import { computed, inject, onMounted } from 'vue'
import { useGlobalStore } from '../../stores/global-store'
import { useStatsStore } from '../../stores/stats-store';
import { AppConfig } from '../../data/types';

const statsStore = useStatsStore()
const globalStore = useGlobalStore()
const { userName, userRole } = useGlobalStore()

const configs = inject('appConfig') as AppConfig

const hasENATemplate = computed(() => configs.general.enaTemplate)

const isAdmin = computed(() => {
    return userRole === 'Admin'
})

onMounted(async () => await getLookupData())

async function getLookupData() {
    if (isAdmin.value) {
        await statsStore.getPortalStats()
    } else {
        await statsStore.getUserStats(userName)
    }
}
const stats = computed(() => isAdmin.value ? statsStore.portalStats : statsStore.userStats)

const adminActions = computed(() => isAdmin.value ? [
    { text: 'Import GoaT Report', value: { name: 'goat-upload' } },
    { text: 'Import Samples from Spreadsheet', value: { name: 'spreadsheet-upload' } },
    { text: 'Import from INSDC', value: { name: 'insdc-form' } },
    { text: 'Create Annotation', value: { name: 'create-annotation' } },
    { text: 'Create User', value: { name: 'create-user' } },
] : [])


</script>