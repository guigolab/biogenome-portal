<template>
    <VaLayout :top="{ fixed: true, order: 3 }" :left="{ fixed: true, absolute: breakpoints.smDown, order: 2, }"
        @left-overlay-click="globalStore.isSidebarVisible = !globalStore.isSidebarVisible">
        <template #top>
            <NavBar />
        </template>
        <template #left>
            <div style="display: flex; height: 100%;">
                <Sidebar />
            </div>
        </template>
        <template #content>
            <main>
                <div class="layout fluid va-gutter-5">
                    <router-view v-slot="{ Component }">
                        <Transition name="fade">
                            <component :is="Component" />
                        </Transition>
                    </router-view>
                </div>
            </main>
        </template>
    </VaLayout>
</template>
<script setup lang="ts">
import { useBreakpoint } from 'vuestic-ui'
import { useGlobalStore } from "../stores/global-store"
import NavBar from '../components/navbar/Navbar.vue'
import Sidebar from '../components/sidebar/Sidebar.vue'
import { onMounted, watch } from 'vue';
import { useItemStore } from '../stores/items-store';
import { useRoute } from 'vue-router';

const itemStore = useItemStore()
const globalStore = useGlobalStore()
const breakpoints = useBreakpoint()
const route = useRoute()

onMounted(async () => {
    if (!globalStore.isAuthenticated) await globalStore.checkUserIsLoggedIn()
})

watch(() => route.name, () => {
    itemStore.isDashBoard = route.name === 'dashboard'
})

</script>