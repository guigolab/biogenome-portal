<template>
    <img :src="imgUrl" />
</template>
<script setup lang="ts">
import { inject } from 'vue';

const settings = inject('appConfig')

const appLogo = settings.general.logo

const imgUrl = new URL(`/src/assets/${appLogo}`, import.meta.url).href


</script>
