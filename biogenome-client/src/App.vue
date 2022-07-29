<template>
<NavBar/>
    <router-view/>
</template>
<script setup>
import NavBar from './components/NavBar.vue';
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  background-color: #eff3f8;
}
.custom-card{
  margin:15px;
}
</style>
