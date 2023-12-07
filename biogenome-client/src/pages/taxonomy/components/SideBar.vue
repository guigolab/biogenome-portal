<template>
    <div>
        <va-tabs grow v-model="explorerStore.selectedTab">
            <template #tabs>
                <va-tab v-for="tab in tabs" :key="tab.title" :name="tab.title">
                    <va-icon :name="tab.icon" size="small" class="mr-2" />
                </va-tab>
            </template>
        </va-tabs>
        <va-divider style="margin: 0;" />
        <div style="min-height: 80vh;" class="row">
            <KeepAlive>
                <div v-if="explorerStore.selectedTab === 'menu.organismsMap'" class="flex lg12 md12 sm12 xs12">
                    <Suspense>
                        <MapCard :model="'taxon'" :id="taxid" />
                        <template #fallback>
                            <va-skeleton height="300px" />
                        </template>
                    </Suspense>
                </div>
            </KeepAlive>
            <KeepAlive>
                <div v-if="explorerStore.selectedTab === 'uiComponents.wikipedia'" class="flex lg12 md12 sm12 xs12">
                    <div class="iframe-wrapper">
                        <iframe :src="src" :key="src"></iframe>
                    </div>
                </div>
            </KeepAlive>
            <KeepAlive>
                <div v-if="explorerStore.selectedTab === 'modelStats.organisms'" class="flex lg12 md12 sm12 xs12">
                    <Suspense>
                        <TaxonDetailsListBlock :taxid="taxid" />
                        <template #fallback>
                            <va-skeleton height="300px"/>
                        </template>
                    </Suspense>
                </div>
            </KeepAlive>
        </div>
    </div>
</template>
<script setup lang="ts">
import MapCard from '../../../components/ui/MapCard.vue'
import { useI18n } from 'vue-i18n'
import { wiki } from '../../../../config.json'
import { onMounted, ref, watch } from 'vue'
import { tabs } from '../configs'
import TaxonDetailsListBlock from '../../taxons/TaxonDetailsListBlock.vue'
import {useExplorerStore} from '../../../stores/explorer-store'

const explorerStore = useExplorerStore()

const wikiMapper = wiki as Record<string, any>
const { locale } = useI18n()
const wikiURL = ref<string>(wikiMapper[locale.value])

const src = ref<string>('')


watch(locale, () => {
    wikiURL.value = wikiMapper[locale.value]
    if (src.value) src.value = `${wikiURL.value}/${props.name}`
})

onMounted(() => {
    src.value = `${wikiURL.value}/${props.name}`
})

const props = defineProps<{
    taxid: string,
    name: string
}>()

</script>
<style>
.map-wrapper {
    height: 70vh;
}

.iframe-wrapper {
    position: relative;
    overflow: visible;
    height: 100%;
}

.iframe-wrapper iframe {

    width: 100%;
    height: 100%;
}
</style>