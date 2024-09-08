<template>
  <VaSidebar v-model="globalStore.isSidebarVisible">
    <div v-if="nav.logo" class="logo">
      <a :href="nav.url" target="_blank"><va-icon color="success" size="5rem" name=app-logo></va-icon></a>
    </div>
    <va-divider />
    <VaSidebarItem v-for="item in items" :key="item.name" :active="isRouteActive(item)" :to="{ name: item.name }">
      <VaSidebarItemContent>
        <VaSidebarItemTitle>
          {{ t(item.displayName) }}
        </VaSidebarItemTitle>
      </VaSidebarItemContent>
    </VaSidebarItem>
    <VaSidebarItem href="https://github.com/guigolab/biogenome-portal" target="_blank">
      <VaSidebarItemContent>
        <VaSidebarItemTitle>
          Github
        </VaSidebarItemTitle>
      </VaSidebarItemContent>
    </VaSidebarItem>
    <VaSidebarItem v-if="globalStore.isAuthenticated" :to="{ name: 'cms-organisms' }">
      <VaSidebarItemContent>
        <VaSidebarItemTitle>
          Admin
        </VaSidebarItemTitle>
      </VaSidebarItemContent>
    </VaSidebarItem>
    <VaSidebarItem v-if="globalStore.isAuthenticated">
      <VaSidebarItemContent @click="logout">
        <VaSidebarItemTitle>
          Logout
        </VaSidebarItemTitle>
      </VaSidebarItemContent>
    </VaSidebarItem>
    <VaSidebarItem v-else-if="cms">
      <VaSidebarItemContent @click="$router.push({ name: 'login' })">
        <VaSidebarItemTitle>
          Login
        </VaSidebarItemTitle>
      </VaSidebarItemContent>
    </VaSidebarItem>
  </VaSidebar>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import NavigationRoutes, { INavigationRoute } from './NavigationRoutes'
import general from '../../../configs/general.json'
import { useGlobalStore } from '../../stores/global-store'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const globalStore = useGlobalStore()
const items = ref(NavigationRoutes.routes)

const nav = computed(() => general.nav || {})

const cms = computed(() => general.cms)

function isRouteActive(item: INavigationRoute) {
  return item.name === route.name || route.meta.name === item.name
}

async function logout() {
  await globalStore.logout()
  router.push({ name: 'dashboard' })
}
</script>

<style lang="scss">
.logo {
  padding: 10px;
  display: flex;
  justify-content: center;
}
</style>
