<template>
    <!-- <Navbar class="main-nav-h" /> -->
    <router-view />

</template>
<script setup lang="ts">
import Navbar from '../components/navbar/Navbar.vue';
</script>
<style>
.main-nav-h {
    height: 5.25rem;
    position: fixed
}

.main-content-mt {
    margin-top: 5.25rem;
}
</style>