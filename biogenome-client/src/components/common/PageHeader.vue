<template>

    <h1 v-if="title" class="va-h1">{{ title[mappedLocale] }}</h1>
    <p v-if="description" style="padding-bottom: 12px" class="va-text-secondary">{{
        description[mappedLocale] }}</p>

</template>
<script setup lang="ts">
import { LangOption } from '../../data/types'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const mappedLocale = locale.value as 'gb' | 'es-ct'

const props = defineProps<{
    title: LangOption,
    description: LangOption
}>()

</script>