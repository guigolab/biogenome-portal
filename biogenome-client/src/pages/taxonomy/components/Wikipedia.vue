<template>
    <div class="iframe-wrapper">
        <iframe :src="src" :key="src"></iframe>
    </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { wiki } from '../../../../config.json'
import { useI18n } from 'vue-i18n'
import { useTaxonomyStore } from '../../../stores/taxonomy-store'

const { locale } = useI18n()

const wikiMapper = wiki as Record<string, any>
const wikiURL = ref<string>(wikiMapper[locale.value])

const taxonomyStore = useTaxonomyStore()

watch(locale, () => {
    wikiURL.value = wikiMapper[locale.value]
})

const src = computed(() => {
    if (taxonomyStore.currentTaxon) return `${wikiURL.value}/${taxonomyStore.currentTaxon.name}`
})

</script>

<style lang="scss">

.iframe-wrapper {
    position: relative;
    overflow: visible;
    height: 100vh;
}

.iframe-wrapper iframe {
    width: 100%;
    height: 100%;
}

</style>