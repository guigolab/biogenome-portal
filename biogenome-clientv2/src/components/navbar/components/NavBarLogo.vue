<template>
    <img :src="imgUrl"/>
</template>
<script setup lang="ts">

import {NavBar} from '../../../../config.json'
const imgUrl = new URL(`/src/assets/${NavBar.logoName}`, import.meta.url).href

</script>
