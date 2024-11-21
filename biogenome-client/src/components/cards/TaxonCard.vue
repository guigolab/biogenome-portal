<template>
    <VaCard>
        <VaCardContent>Overview of {{ name }} </VaCardContent>
        <VaCardContent v-if="taxonomyStore.isWikiLoading">
            <VaSkeleton :lines="3" />
        </VaCardContent>
        <VaCardContent v-else>
            <p><span class="va-text-bold">Rank: </span> {{ rank }}</p>
            <p v-if="taxonomyStore.wikiSummary" class="mt-2 light-paragraph">
                {{ taxonomyStore.wikiSummary }} <a class="va-link" @click="showModal = !showModal">Read more..
                </a>
            </p>
        </VaCardContent>
    </VaCard>
    <VaModal close-button hide-default-actions v-model="showModal">
        <div class="iframe-wrapper">
            <iframe :src="src" :key="src"></iframe>
        </div>
    </VaModal>
</template>
<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n'
import general from '../../../configs/general.json'
import { useTaxonomyStore } from '../../stores/taxonomy-store';
import { useItemStore } from '../../stores/items-store';
import { tree } from 'd3';

const { locale } = useI18n()
const taxonomyStore = useTaxonomyStore()
const itemsStore = useItemStore()

const props = defineProps<{
    name: string,
    rank: string,
}>()

const showModal = ref(false)
const wikiMapper = general.wiki as Record<string, any>
const wikiURL = ref<string>(wikiMapper[locale.value])


watch(() => locale, async () => {
    wikiURL.value = wikiMapper[locale.value]
    await getSummary()
})

async function getSummary() {
    const lang = wikiURL.value.split('.')[0]
    await taxonomyStore.getSummary(lang, props.name)
}

watch(() => props.name, async () => {
    await getSummary()
}, { immediate: true })

const src = computed(() => {
    return `${wikiURL.value}/${props.name}`
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