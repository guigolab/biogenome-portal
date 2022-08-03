<template>
<div>
  <va-navbar>
      <template #left>
        <va-navbar-item><va-image :src="imagePath" /></va-navbar-item>
      </template>
      <template #right>
        <va-navbar-item v-for="(item,index) in navItems" :key="index">
          <va-icon :name="item.icon" @click="$router.push({name:item.pathName})"/>
        </va-navbar-item>
        <!-- <va-navbar-item><va-icon name="call_split"></va-icon></va-navbar-item> -->
        <va-navbar-item v-if="authStore.isAuthenticated"><va-icon name="settings" @click="$router.push({name:'admin-hp'})"></va-icon></va-navbar-item>
        <va-navbar-item v-if="!authStore.isAuthenticated"><va-icon name="person" @click="authStore.showModal=true"/></va-navbar-item>
        <va-navbar-item v-else>{{authStore.user.name}}</va-navbar-item>
      </template>
  </va-navbar>
  <Login/>
</div>
</template>
<script setup>
import Login from './admin/form/Login.vue'
import {ref} from 'vue'
import {auth} from '../stores/auth'
import {NavBar} from '../../config'

const imagePath = NavBar.logoPath
const navItems = NavBar.navItems
const authStore = auth()
const showModal = ref(false)


</script>