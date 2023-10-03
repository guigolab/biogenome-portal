<template>
  <AppLayout />
</template>
<script setup>
  import { onMounted } from 'vue'
  import AppLayout from './layouts/AppLayout.vue'
  import {appInfo} from '../config.json'

    onMounted(()=>{
      document.title = appInfo.title
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
    font-size: 1rem;
  }
</style>
