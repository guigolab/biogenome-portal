<script setup>
import OrganismForm from './components/OrganismForm.vue'
import TreeSideBar from './components/TreeSideBar.vue'
</script>

<template>
<div class="row">
  <div class="flex">
      <router-view/>
  </div>
</div>
</template>


<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
  background-color: #eff3f8;
}
.custom-card{
  margin:15px;
}
</style>
