<template>
  <VaNavbar  class="nav-p">
    <template #left>
      <VaIcon size="4rem" name="app-logo"></VaIcon>
    </template>
    <template #center>
      <span v-if="globalStore.userName && globalStore.isAuthenticated">{{ globalStore.userName }}</span>
    </template>
    <template #right>
      <LanguageDropdown />
    </template>
  </VaNavbar>
</template>

<script setup lang="ts">
import { useGlobalStore } from '../../stores/global-store'
import LanguageDropdown from './components/LanguageDropdown.vue'


const globalStore = useGlobalStore()


</script>
<style>

.nav-p{
  padding-bottom: 10px!important;
  padding-top: 10px!important;
}

</style>