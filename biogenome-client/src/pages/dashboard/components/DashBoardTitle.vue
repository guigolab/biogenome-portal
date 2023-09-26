<template>
    <div class="row align-center">
        <div v-if="navBar.logoName" class="flex">
            <a :href="navBar.url" target="_blank"><va-icon color="success" size="5rem" name=app-logo></va-icon></a>
        </div>
        <div class="flex lg8 md8">
            <h1 class="va-h1">{{ appData.title }}</h1>
            <p>{{ appData[locale].description }}</p>
        </div>
    </div>
</template>
<script setup lang="ts">
import {appInfo,navBar } from '../../../../config.json'
import { useI18n } from 'vue-i18n'
const { locale } = useI18n() 
const appData = appInfo as Record<string,any>
</script>