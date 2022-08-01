<template>
<NavBar/>
<div id="app">
    <router-view/>
</div>
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

.box{
    transition: box-shadow .5s;
    border: 1px solid #eff3f8;
}

.box:hover{
    box-shadow: 0 0 15px rgba(33,33,33,.2);
    border: 1px solid rgba(33,33,33,.2);
}
</style>
