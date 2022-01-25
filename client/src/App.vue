<template>
  <div id="app">
    <nav-bar-component></nav-bar-component>
    <b-overlay :show="loading">
    <b-container fluid class="router-container">
      <b-row>
        <b-col cols="4">
          <bread-crumb-component/>
        </b-col>
      </b-row>
      <b-row>
        <b-col cols="2"/>
        <b-col cols="8">
          <b-container fluid class="router-container">
              <router-view />
          </b-container>
        </b-col>
        <b-col cols="2"/>
      </b-row>
    </b-container>
    </b-overlay>
  </div>
</template>

<script>
import {BOverlay} from 'bootstrap-vue'
import BreadCrumbComponent from './components/BreadCrumbComponent.vue';
import NavBarComponent from './components/NavBarComponent.vue'

export default {
  name: "app",
  computed: {
    loading(){
      return this.$store.getters['portal/getState'].loading
    }
  },
components: {
  NavBarComponent,
  BreadCrumbComponent,
  BOverlay
  }
};
</script>
<style>
  .router-container {
    padding: 15px;
  }
  .row{
    margin-bottom: 10px;
  }
</style>