<template>
  <div id="app">
    <nav-bar-component></nav-bar-component>
    <b-overlay :show="loading">
    <b-container fluid class="router-container">
      <b-row>
        <alert-component/>
      </b-row>
      <b-row>
        <b-col lg="4">
          <bread-crumb-component/>
        </b-col>
      </b-row>
      <b-row>
        <b-col lg="1"/>
        <b-col lg="10">
          <b-container fluid class="router-container">
              <router-view />
          </b-container>
        </b-col>
        <b-col lg="1"/>
      </b-row>
    </b-container>
    </b-overlay>
  </div>
</template>

<script>
import {BOverlay} from 'bootstrap-vue'
import BreadCrumbComponent from './components/base/BreadCrumbComponent.vue';
import NavBarComponent from './components/base/NavBarComponent.vue'
import AlertComponent from './components/base/AlertComponent.vue';

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
  BOverlay,
  AlertComponent,
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