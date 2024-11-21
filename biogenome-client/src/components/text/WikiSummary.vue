<template>
    <div class="row justify-center">
        <div class="flex lg12 md12 sm12 xs12">
            <h2 class="va-h2 mt-0">{{ name }}</h2>
            <p><span class="va-text-bold">Rank: </span> {{ rank }}</p>
            <p v-if="content" class="mt-2 light-paragraph">
                {{ content }} <a class="va-link" @click="showModal = !showModal">Read more..
                </a>
            </p>
        </div>
    </div>
    <!-- <VaCard>
        <VaCardContent>
            <h2 class="va-h2">Voerv</h2>
        </VaCardContent>
        <VaCardContent>
            <p><span class="va-text-bold">Rank: </span> {{ rank }}</p>
        </VaCardContent>
        <VaCardContent v-if="content">
            <p class="mt-2 light-paragraph">
                {{ content }} <a class="va-link" @click="showModal = !showModal">Read more..
                </a>
            </p>
        </VaCardContent>
    </VaCard> -->
    <VaModal close-button hide-default-actions v-model="showModal">
        <div class="iframe-wrapper">
            <iframe :src="src" :key="src"></iframe>
        </div>
    </VaModal>
</template>
<script setup lang="ts">

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n'
import general from '../../configs/general.json'
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { useItemStore } from '../stores/items-store';

const { locale } = useI18n()
const taxonomyStore = useTaxonomyStore()
const itemsStore = useItemStore()

const props = defineProps<{
    name: string,
    rank: string,
    taxid: string,
}>()

const showModal = ref(false)
const wikiMapper = general.wiki as Record<string, any>
const wikiURL = ref<string>(wikiMapper[locale.value])

const content = computed(() => taxonomyStore.wikiSummary)

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

//async Mount
if (!taxonomyStore.wikiSummary || props.name !== itemsStore.parentTaxon?.name)
    await getSummary()


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