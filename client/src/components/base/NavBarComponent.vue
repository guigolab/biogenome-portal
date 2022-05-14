<template>
    <div style="margin-bottom:15px">
  <b-navbar toggleable="lg" type="dark" variant="success">
    <b-navbar-brand href="#"> <img :src="'./static/img/EBG-Logo.png'" id="logo-image" alt="EBP logo" width="100"/></b-navbar-brand>
    <b-navbar-toggle target="nav-collapse">
    </b-navbar-toggle>
    <!-- <b-navbar-nav class="ml-auto">
    </b-navbar-nav> -->
    <b-collapse id="nav-collapse" is-nav>
    <!-- <b-sidebar id="nav-collapse" bg-variant="success" text-variant="light" shadow aria-labelledby="sidebar-no-header-title" no-header right
      backdrop
      > -->
        <b-navbar-nav class="ml-auto">
            <!-- <b-nav-item  active-class="active" class="nav-link" to="/" >
              HOME 
            </b-nav-item> -->
            <b-nav-item  active-class="active" class="nav-link" :to="{name: 'tree-of-life', params: {node: root}}">
              <b-icon-diagram3/> TREE OF LIFE 
            </b-nav-item>
            <b-nav-item  active-class="active" class="nav-link" :to="{name:'Map'}" >
              <b-icon-map/> MAP 
            </b-nav-item>
        </b-navbar-nav>
    </b-collapse>
    <!-- </b-sidebar> -->
    </b-navbar>
</div>
</template>
<script>
import { BNavbar,BNavbarBrand, BIconMap,BIconDiagram3,BNavbarToggle, BNavItem, BNavbarNav, BCollapse} from 'bootstrap-vue'
import {ROOTNODE} from '../../utils/static-config'

export default {
  data(){
    return {
      root : ROOTNODE
    }
  },
  components: {
    BNavbar, BNavbarToggle, BNavItem, BNavbarNav, BCollapse,BNavbarBrand,BIconMap,BIconDiagram3
  }
  
}
</script>
<style scoped>
.nav-link {
  color: rgb(255, 255, 255) !important;
}
</style>