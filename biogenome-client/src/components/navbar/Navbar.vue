<template>
  <VaNavbar hide-on-scroll class="navbar-h">
    <template #left>
      <VaIcon size="2rem" color="primary" :name="globalStore.isSidebarVisible ? 'menu_open' : 'menu'"
        @click="globalStore.isSidebarVisible = !globalStore.isSidebarVisible" />
    </template>
    <template #center>
      <span v-if="globalStore.userName && globalStore.isAuthenticated">{{ globalStore.userName }}</span>
    </template>
    <template #right>
      <LanguageDropdown class="app-navbar-actions__item" />
    </template>
  </VaNavbar>
</template>

<script setup lang="ts">
import { useGlobalStore } from '../../stores/global-store'
import LanguageDropdown from './components/LanguageDropdown.vue'


const globalStore = useGlobalStore()




</script>
