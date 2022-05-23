<template>
  <div id="app">
    <nav-bar-component></nav-bar-component>
    <b-overlay :show="loading">
    <b-container fluid class="router-container">
      <b-row>
        <b-col lg="6">
          <b-alert style="font-size:0.8rem" dismissible show variant="success">
            <p>
              This data portal is an instance of the <a href="https://github.com/guigolab/biogenome-portal" class="alert-link">BioGenome portal</a> software.
              It tracks the <a href="https://www.insdc.org/" class="alert-link">INSDC</a> public data under the <a href="https://www.earthbiogenome.org/" class="alert-link">Earth BioGenome Project</a> umbrella.
            </p>
            <p>
              The annotations are retrieved from the <a class="alert-link" href="https://genome.crg.cat/geneid-predictions/#/"> Geneid Predictions API</a>, annotations from other sources will be added soon.
            </p>
            <hr>
            <p class="mb-0">
             This is the official data portal of the Earth BioGenome Project.
             Refer to <a href="https://goat.genomehubs.org/projects/EBP" class="alert-link">GoaT</a> to view the EBP's sequencing progress.
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
    <div style="display:flex;justify-content:end">
        <a class="footer-logo" href="https://www.biogenoma.cat/"><img width="100" :src="'./static/img/CBP-logo.png'"></a>
        <a class="footer-logo" href="https://scb.iec.cat/"><img width="100" :src="'./static/img/logoSCB.svg'"></a>
        <a class="footer-logo" href="https://www.crg.eu/"><img width="100" :src="'./static/img/CRG-logo.png'"></a>
    </div>
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
  .footer-logo {
    margin:1rem
  }
</style>