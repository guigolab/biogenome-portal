<template>
    <h1 class="va-h1">{{ validTitle }}</h1>
    <p class="light-paragraph pb-12" v-if="validDescription">{{
        validDescription }}</p>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { LangOption } from '../../data/types'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const mappedLocale = locale.value as 'gb' | 'es-ct'

const props = defineProps<{
    title: LangOption,
    description: LangOption
}>()

const validTitle = computed(() => {
    return props.title[mappedLocale] ? props.title[mappedLocale] : props.title
})

const validDescription = computed(() => {
    return props.description && props.description[mappedLocale] ? props.description[mappedLocale] : ""
})


</script>
<style scoped>
.pb-12 {
    padding-bottom: 12px
}
</style>