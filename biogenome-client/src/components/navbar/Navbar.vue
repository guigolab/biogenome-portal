<template>
  <VaNavbar style="z-index: 10;" bordered class="nav-p">
    <template #left>
      <VaIcon size="4rem" name="app-logo"></VaIcon>
    </template>

    <template #right>
      <VaMenu :options="models">
        <template #anchor>
          <VaButton icon="fa-database" color="textPrimary" preset="secondary">Data</VaButton>
        </template>
      </VaMenu>
      <VaMenu :options="features" style="margin-left: 5px;">
        <template #anchor>
          <VaButton icon="fa-wrench" color="textPrimary" preset="secondary">Tools</VaButton>
        </template>
      </VaMenu>
      <VaMenu :options="settings" style="margin-left: 5px;">
        <template #anchor>
          <VaButton icon="fa-cog" color="textPrimary" preset="secondary">Settings</VaButton>
        </template>
      </VaMenu>
      <!-- <LanguageDropdown /> -->
    </template>
  </VaNavbar>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useGlobalStore } from '../../stores/global-store'
import LanguageDropdown from './components/LanguageDropdown.vue'


const config = inject('appConfig') as any

const generalConfigs = ['general', 'dashboard', 'ui']

const models = computed(() => Object.keys(config).filter(k => !generalConfigs.includes(k)))

const features = ['Taxonomy Explorer', 'Genome Browser', '3D Map']

const settings = ['Login', 'Languages', 'GitHub', 'API Docs']
//retrieve configured models 
const globalStore = useGlobalStore()


</script>
<style>
.nav-p {
  padding-bottom: 10px !important;
  padding-top: 10px !important;
}
</style>