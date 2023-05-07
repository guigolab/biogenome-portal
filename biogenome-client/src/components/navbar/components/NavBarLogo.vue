<template>
    <img :src="imgUrl"/>
</template>
<script setup lang="ts">

import {navBar} from '../../../../config.json'
const imgUrl = new URL(`/src/assets/${navBar.logoName}`, import.meta.url).href

</script>
