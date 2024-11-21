<template>
    <div class="row justify-space-between align-end">
        <div class="flex">
            <h1 v-if="validTitle" class="va-h2 mt-0">{{ validTitle }}</h1>
            <p class="light-paragraph" v-if="validDescription">{{
                validDescription }}</p>
        </div>
        <div v-if="taxName" class="flex">
            <VaChip outline>{{ taxName }}</VaChip>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { LangOption } from '../data/types'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const mappedLocale = locale.value as 'gb' | 'es-ct'

const props = defineProps<{
    title: LangOption,
    description: LangOption,
    taxName?: string
}>()

const validTitle = computed(() => {

    return props.title[mappedLocale] ? props.title[mappedLocale] : props.title
})

const validDescription = computed(() => {
    return props.description && props.description[mappedLocale] ? props.description[mappedLocale] : ""
})
</script>