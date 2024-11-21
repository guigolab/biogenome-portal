<template>
    <div v-if="wikiStore.isLoading">
        <Skeleton v-for="i in [1, 2, 3]" :key="i" class="mb-2" width="100%" />
    </div>
    <div v-else>
        <div v-if="summary">
            <p class="mt-2">
                {{ summary }}
            </p>
            <p class="p-button-text hover:underline cursor-pointer" @click="showModal = !showModal">
                Read more..
            </p>
        </div>
    </div>
    <Dialog v-model:visible="showModal" modal :style="{ width: '50rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
        <div class="iframe-wrapper">
            <iframe :src="src" :key="src"></iframe>
        </div>
    </Dialog>
</template>
<script setup lang="ts">

//TODO: COME BACK TO LOCALE WIKIPEDIA
import { computed, ref, watch } from 'vue';
import { useItemStore } from '../stores/items-store';
import { useWikiStore } from '../stores/wiki-store';

const itemStore = useItemStore()

const wikiStore = useWikiStore()

const name = computed(() => itemStore.parentTaxon?.name)
const showModal = ref(false)

watch(() => name.value, async () => {
    if (name.value) await wikiStore.getSummary(name.value)
}, { immediate: true })

const summary = computed(() => wikiStore.summary ? wikiStore.summary.split('.')[0] + '...' : null)

const src = computed(() => {
    return `https://${wikiStore.lang}.m.wikipedia.org/wiki/${name.value}`
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