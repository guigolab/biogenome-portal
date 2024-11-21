<template>
    <section class="layout fluid va-gutter-5">
        <div class="hero row align-center justify-center">
            <div class="flex lg8 md8 sm12 xs12">
                <div class="row justify-center">
                    <div class="flex">
                        <h1 class="va-text-primary">{{ validTitle }}</h1>
                        <p v-if="validDescription">{{
                            validDescription }}</p>
                    </div>
                </div>
                <div class="row justify-center">
                    <div class="flex">
                        <VaButton color="primary" class="cta-button">Get Started</VaButton>
                    </div>
                    <div class="flex">
                        <VaButton color="secondary" class="cta-button">Learn More</VaButton>
                    </div>
                </div>
            </div>
            <div class="flex lg4 md4 sm12 xs12">
                <VaIcon v-if="nav && nav.logo" size="10rem" name="app-logo" />
            </div>
        </div>
    </section>
</template>
<script setup lang="ts">
import generalConfig from '../../configs/general.json'
import { computed } from 'vue';
import { LangOption } from '../data/types'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const mappedLocale = locale.value as 'gb' | 'es-ct'

const props = defineProps<{
    title?: LangOption,
    description?: LangOption
}>()

const validTitle = computed(() => {
    if (!props.title) return
    return props.title[mappedLocale] ? props.title[mappedLocale] : props.title
})

const validDescription = computed(() => {
    if (!props.description) return
    return props.description && props.description[mappedLocale] ? props.description[mappedLocale] : ""
})

const nav = generalConfig.nav


</script>
<style scoped>
.hero {
    height: 60vh;
}

h1 {
    color: var(--va-text-primary) !important;
}

.text-align-center {
    text-align: center;
}
</style>