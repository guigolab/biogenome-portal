<template>
  <component :is="route.meta.layout === 'AdminLayout' ? AdminLayout : DefaultLayout">
    <router-view />
  </component>

</template>
<script setup lang="ts">

import { computed, inject, onMounted } from 'vue';
import { useGlobalStore } from './stores/global-store';
import { AppConfig, LangOption } from './data/types';
import { useI18n } from 'vue-i18n';

import { useRoute } from 'vue-router';
import DefaultLayout from './layouts/DataLayout.vue';
import AdminLayout from './layouts/AdminLayout.vue';

const route = useRoute();

const settings = inject('appConfig') as AppConfig
const dashboardDefaultTitle = "BioGenome Portal"
const { locale } = useI18n()

const title = computed<LangOption | string>(() => settings.general.title[locale.value] ?? dashboardDefaultTitle)

onMounted(() => {
  document.title = title.value as string
})

</script>
<style lang="scss">
@import 'scss/main.scss';

/* Initial state when the element is inserted */
.slide-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

/* Active transition state when the element is entering */
.slide-enter-active {
  transition: all 0.3s ease;
}

/* Final state when the element has entered */
.slide-enter-to {
  transform: translateY(0);
  opacity: 1;
}

/* Initial state when the element is leaving */
.slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}

/* Active transition state when the element is leaving */
.slide-leave-active {
  transition: all 0.3s ease;
}

/* Final state when the element has left */
.slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

#app {
  font-family: 'Source Sans Pro', Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.row-equal {
  .flex {
    .va-card {
      height: 100%;
    }
  }
}

.custom-chip {
  border: 2px solid;
  border-radius: 1rem;
  padding: 3px;
  font-size: 0.75rem;
}

.mr-2 {
  margin-right: 2px;
}

.mt-0 {
  margin-top: 0;
}

.m-0 {
  margin: 0
}

.p-0 {
  padding: 0 !important;
}

.pb-0 {
  padding-bottom: 0;
}

.ml-2 {
  margin-left: 2px;
}

.navbar-h {
  height: 4rem;
}

.h-450 {
  height: 450;
}


.w-300 {
  width: 300px;
}

.mt-6 {
  margin-top: 6;
}

.pt-0 {
  padding-top: 0;
}


.p-10 {
  padding: 10;
}


.pb-10 {
  padding-bottom: 10px;
}

.ml-6 {
  margin-left: 6px;
}

.mb-15 {
  margin-bottom: 15px;
}

.mh-450 {
  min-height: 450px;
}

.w-250 {
  width: 250px;
}

.mw-200 {
  min-width: 200px
}

.mw-250 {
  min-width: 250px
}

.mb-6 {
  margin-bottom: 6px
}

.gap-1 {
  gap: 1rem
}

.mb-12 {
  margin-bottom: 12px
}

body {
  margin: 0;
}

.light-paragraph {
  color: var(--va-light, #666E75);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active {
  transition: opacity 0.5s ease;
}

text {
  font-size: .8rem;
}

.c-h {
  min-height: 400px;
}
</style>