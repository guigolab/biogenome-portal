<template>
    <p class="light-paragraph" v-if="content">
        {{ content }} <a class="va-link" @click="showModal = !showModal">Read more..
        </a>
    </p>
    <p class="light-paragraph" v-else>
        {{ rank }}
    </p>
    <VaModal close-button hide-default-actions  v-model="showModal">
        <div class="iframe-wrapper">
            <iframe :src="src" :key="src"></iframe>
        </div>
    </VaModal>
</template>
<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n'
import general from '../../../configs/general.json'

const { locale } = useI18n()

const props = defineProps<{
    name: string,
    rank: string
}>()
const showModal = ref(false)
const wikiMapper = general.wiki as Record<string, any>
const wikiURL = ref<string>(wikiMapper[locale.value])

const content = ref()

watch(locale, async () => {
    wikiURL.value = wikiMapper[locale.value]
    const lang = wikiURL.value.split('.')[0]
    content.value = await getContent(lang, props.name)
})

watch(() => props.name, async () => {
    const lang = wikiURL.value.split('.')[0]
    content.value = await getContent(lang, props.name)
})

const src = computed(() => {
    return `${wikiURL.value}/${props.name}`
})

onMounted(async () => {
    const lang = wikiURL.value.split('.')[0]
    content.value = await getContent(lang, props.name)
})

async function getContent(lang: string, name: string) {
    const url = `${lang}.m.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
    const response = await fetch(url)

    // Check if the response is okay (status code 200-299)
    if (!response.ok) {
        return null
    }

    const data = await response.json()
    if (data.extract_html) return data.extract

    return null
}

</script>
<style lang="scss">
.iframe-wrapper {
    position: relative;
    overflow: visible;
    height: 90vh;
}

.iframe-wrapper iframe {
    width: 100%;
    height: 100%;
}
</style>