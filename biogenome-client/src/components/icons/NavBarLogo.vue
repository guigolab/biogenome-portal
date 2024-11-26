<template>
    <img :src="imgUrl" />
</template>
<script setup lang="ts">

import general from '../../configs/general.json'

const nav = general.nav

const imgUrl = new URL(`/src/assets/${nav.logo}`, import.meta.url).href



</script>
