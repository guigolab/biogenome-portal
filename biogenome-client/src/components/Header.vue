<template>
    <h1 v-if="validTitle" :class="titleClass">{{ validTitle }}</h1>
    <p v-if="validDescription" :class="descriptionClass">{{ validDescription }}</p>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { LangOption } from '../data/types'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const props = defineProps<{
    title: LangOption | string,
    titleClass: string,
    description?: LangOption | string,
    descriptionClass?: string
}>()

const computedLocale = computed(() => locale.value as 'en' | 'es-ct')

const validTitle = computed(() => {
    if (props.title) {
        if (typeof props.title === 'string') {
            return props.title;
        } else if (props.title[computedLocale.value]) {
            return props.title[computedLocale.value];
        } else {
            //default to english
            return props.title.en
        }
    }
    return null;
});

const validDescription = computed(() => {
    if (props.description) {
        if (typeof props.description === 'string') {
            return props.description;
        } else if (props.description[computedLocale.value]) {
            return props.description[computedLocale.value];
        } else {
            return props.description.en
        }
    }
    return null;
});

</script>