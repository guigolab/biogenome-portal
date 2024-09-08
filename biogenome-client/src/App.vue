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
    const src = import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH + `/tracking/${tracker}` : `/tracking/${tracker}`
    const trackerScript = document.createElement('script')
    trackerScript.setAttribute("type", "text/javascript")
    trackerScript.setAttribute("src", src)
    document.head.appendChild(trackerScript)
  }
})

</script>

<style lang="scss">
@import 'scss/main.scss';

#app {
  font-family: 'Source Sans Pro', Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
.mr-2{
  margin-right: 2px;
}
.ml-2{
  margin-left: 2px;
}
body {
  margin: 0;
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
