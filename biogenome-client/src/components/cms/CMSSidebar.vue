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
                    <VaSidebarItem :to="{ name: 'goat-upload' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                Import GoaT Report
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                    <VaSidebarItem :to="{ name: 'spreadsheet-upload' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                Import Sample Spreadsheet
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                    <VaSidebarItem :to="{ name: 'publish-biosample' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                Publish Sample to EBI
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
                    <VaSidebarItem :to="{ name: 'submitted-biosamples' }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                BioSamples Submitted to EBI
                            </VaSidebarItemTitle>
                        </VaSidebarItemContent>
                    </VaSidebarItem>
                    <VaSidebarItem class="va-text-capitalize" v-for="stat in stats"
                        :to="{ name: 'cms-items', params: { model: stat.key } }">
                        <VaSidebarItemContent>
                            <VaSidebarItemTitle>
                                {{ stat.key.split('_').join(' ') }}
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
import { computed, onMounted } from 'vue'
import { useGlobalStore } from '../../stores/global-store'
import { useStatsStore } from '../../stores/stats-store';

const statsStore = useStatsStore()
const globalStore = useGlobalStore()
const { userName, userRole } = useGlobalStore()

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
    { text: 'Import from INSDC', value: { name: 'insdc-form' } },
    { text: 'Create Annotation', value: { name: 'create-annotation' } },
    { text: 'Create User', value: { name: 'create-user' } },
] : [])


</script>