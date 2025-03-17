<template>
    <VaLayout :top="{ fixed: true, order: 3, }" :left="{ fixed: true, absolute: breakpoints.smDown, order: 2, }">
        <template #top>
            <VaNavbar shadowed>
                <template #left>
                    <VaNavbarItem>
                        <VaButton preset="secondary" :icon="globalStore.adminSidebar ? 'menu_open' : 'menu'"
                            @click="globalStore.adminSidebar = !globalStore.adminSidebar" />
                    </VaNavbarItem>
                    <VaNavbarItem>
                        <span class="va-h6">
                            {{ globalStore.userName }}
                        </span>
                    </VaNavbarItem>
                </template>
                <template #right>
                    <VaNavbarItem>
                        <VaButton @click="logoutUser" preset="secondary" icon="logout">Logout</VaButton>
                    </VaNavbarItem>
                </template>
            </VaNavbar>
        </template>
        <template #left>
            <CMSSidebar />
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
import { useGlobalStore } from '../stores/global-store'
import { useRouter } from 'vue-router';
import { useBreakpoint } from 'vuestic-ui';
import CMSSidebar from '../components/cms/CMSSidebar.vue';

const router = useRouter()
const globalStore = useGlobalStore()
const breakpoints = useBreakpoint()


async function logoutUser() {
    await globalStore.logout()
    router.push({ name: 'home' })
}

</script>