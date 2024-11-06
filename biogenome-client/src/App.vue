<template>
  <Layout />
</template>
<script setup>
import { onMounted } from 'vue'
import Layout from './layouts/Layout.vue'
import config from '../configs/general.json'

onMounted(() => {
  document.title = config.title
  if (config.tracker) {
    setConfigTracker()
  }
})

function setConfigTracker() {
  const src = import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH + `/tracking/${config.tracker}` : `/tracking/${config.tracker}`
  const trackerScript = document.createElement('script')
  trackerScript.setAttribute("type", "text/javascript")
  trackerScript.setAttribute("src", src)
  document.head.appendChild(trackerScript)
}

</script>

<style lang="scss">
@import 'scss/main.scss';

#app {
  font-family: 'Source Sans Pro', Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
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
  padding: 0;
}

.pb-0 {
  padding-bottom: 0;
}

.ml-2 {
  margin-left: 2px;
}

.navbar-h {
  height: 70px;
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
