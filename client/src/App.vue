<template>
  <div id="app">
    <nav-bar-component></nav-bar-component>
    <b-overlay :show="loading">
    <b-container fluid class="router-container">
      <b-row>
        <b-col lg="6">
          <b-alert dismissible show variant="success">
            <p>
              This data portal is an instance of the <a href="https://github.com/guigolab/biogenome-portal" class="alert-link">BioGenome portal</a> software.
            </p>
            <p>
              It tracks the <a href="https://www.insdc.org/" class="alert-link">INSDC</a> public data under the <a href="https://www.earthbiogenome.org/" class="alert-link">Earth BioGenome Project</a> umbrella.
            </p>
            <hr>
            <p class="mb-0">
              <strong>IMPORTANT</strong>: This is <strong>NOT</strong> the official data portal of the Earth BioGenome Project.
              Refer to <a href="https://goat.genomehubs.org/" class="alert-link">GoaT</a> to view the Earth BioGenome Project sequencing progress.
            </p>
          </b-alert>
        </b-col>
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
              <router-view />
        </b-col>
        <b-col lg="1"/>
      </b-row>
    </b-container>
    <login-modal/>
    </b-overlay>
  </div>
</template>

<script>
import {BOverlay,BAlert} from 'bootstrap-vue'
import BreadCrumbComponent from './components/base/BreadCrumbComponent.vue';
import NavBarComponent from './components/base/NavBarComponent.vue'
import AlertComponent from './components/base/AlertComponent.vue';
import LoginModal from './components/modal/LoginModal.vue';

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
  BAlert,
  AlertComponent,
  LoginModal,
  }
};
</script>
<style>
  .router-container {
    padding: 15px;
  }
  .row{
    margin-bottom: 5px;
  }
</style>