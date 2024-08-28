<template>
    <img :src="imgUrl" />
</template>
<script setup lang="ts">

import { nav } from '../../../config.json'

const imgUrl = new URL(`/src/assets/${nav.logo}`, import.meta.url).href

</script>
