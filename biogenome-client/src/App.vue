<template>
  <div id="app" >
    <NavBarComponent/>
    <div>
      <div style="min-height:100vh;background-color: #eff3f8">
        <router-view/>
      </div>
    </div>
    <Login/>
  </div>
</template>
<script setup>
import NavBarComponent from './components/NavBar.vue'
import Login from './components/admin/form/Login.vue'
import {Application} from '../config.json'
import { onMounted } from '@vue/runtime-core'

onMounted(()=>{
  document.title = Application.title
})

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
    box-shadow: 0 0 15px rgba(19, 18, 18, 0.2);
    border: 1px solid rgba(33,33,33,.2);
}
</style>
