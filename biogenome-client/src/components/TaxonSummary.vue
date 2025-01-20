<template>
    <div v-if="content">
        <p class="light-paragraph">
            {{ content }}
        </p>
        <p>
            <a class="va-link" @click="showModal = !showModal">Read more
            </a>
        </p>
    </div>

    <p class="light-paragraph" v-else>
        {{ rank }}
    </p>
    <VaModal close-button hide-default-actions v-model="showModal">
        <div class="iframe-wrapper">
            <iframe :src="src" :key="src"></iframe>
        </div>
    </VaModal>
</template>
<script setup lang="ts">

import { computed, onMounted, ref, watch, inject } from 'vue';
import { useI18n } from 'vue-i18n'
import { useTaxonomyStore } from '../stores/taxonomy-store';

const { locale } = useI18n()
const taxonomyStore = useTaxonomyStore()

const settings = inject('appConfig') as any
const props = defineProps<{
    name: string,
    rank: string
}>()
const showModal = ref(false)
const wikiMapper = settings.general.wiki as Record<string, any>
console.log(locale.value)
const wikiURL = ref<string>(wikiMapper[locale.value])

const content = computed(() => taxonomyStore.wikiSummary.split('.')[0]?  taxonomyStore.wikiSummary.split('.')[0] + '...' : null)
// const summary = computed(() => wikiStore.summary ? wikiStore.summary.split('.')[0] + '...' : null)

watch(locale, async () => {
    wikiURL.value = wikiMapper[locale.value]
    await getSummary()
})

async function getSummary() {
    const lang = wikiURL.value.split('.')[0]
    await taxonomyStore.getSummary(lang, props.name)
}

watch(() => props.name, async () => {
    await getSummary()
})

const src = computed(() => {
    return `${wikiURL.value}/${props.name}`
})

onMounted(async () => {
    await getSummary()
})

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