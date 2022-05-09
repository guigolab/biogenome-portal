<template>
    <div style="margin-bottom:15px">
  <b-navbar toggleable="true" type="dark" variant="dark">
    <b-navbar-brand href="#"><img :src="'./static/img/EBG-Logo.png'" id="logo-image" alt="EBP logo" width="150"></b-navbar-brand>
    <b-navbar-toggle target="nav-collapse">
    </b-navbar-toggle>
    <b-sidebar id="nav-collapse" bg-variant="dark" text-variant="light" shadow aria-labelledby="sidebar-no-header-title" no-header right
      backdrop
      >
    <div class="p3">
      <b-nav vertical align="end">
           <b-nav-item  active-class="active" class="nav-link" to="/" >
            HOME 
          </b-nav-item>
          <b-nav-item  active-class="active" class="nav-link" :to="{name: 'tree-of-life', params: {node: root}}">
            TREE OF LIFE 
          </b-nav-item>
      </b-nav>
    </div>
    </b-sidebar>
    </b-navbar>
</div>
</template>
<script>
import { BNavbar, BSidebar, BNav, BNavbarToggle, BNavItem} from 'bootstrap-vue'
import {ROOTNODE} from '../../utils/static-config'

export default {
  data(){
    return {
      root : ROOTNODE
    }
  },
  components: {
    BNavbar, BSidebar, BNav, BNavbarToggle, BNavItem
  }
  
}
</script>
<style scoped>
.nav-link {
  color: white !important;
}
</style>