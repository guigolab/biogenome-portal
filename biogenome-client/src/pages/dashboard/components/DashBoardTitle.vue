<template>
    <div class="row align-end justify-space-between">
        <div class="flex lg10 md10 sm12 xs12">
            <div class="row align-center">
                <div v-if="navBar.logoName" class="flex" style="padding: 0;">
                    <a :href="navBar.url" target="_blank"><va-icon color="success" size="5rem" name=app-logo></va-icon></a>
                </div>
                <div class="flex lg10 md10" style="padding: 0;">
                    <h1 class="va-h1">{{ appData.title }}</h1>
                    <p>{{ appData[locale].description }}</p>
                </div>
            </div>
        </div>
        <div style="padding: 0;" class="flex">
            <va-button icon="travel_explore" :to="{ name: 'taxonomy-explorer' }">
                {{ t('dashboard.toExplorer') }}
            </va-button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { appInfo, navBar } from '../../../../config.json'
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()
const appData = appInfo as Record<string, any>
</script>