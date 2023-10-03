<template>
    <div class="row">
        <div class="flex lg8 md8 md12 sm12">
            <Suspense>
                <template #fallback>
                    <va-skeleton height="100vh" />
                </template>
                <div class="hypertree-wrapper">
                    <D3HyperTree :taxid="rootNode" @node-change="setCurrentTaxon" />
                </div>
            </Suspense>
        </div>
        <div v-if="currentTaxon" :key="currentTaxon.taxid" class="flex lg 4 md4 sm12 xs12">
            <div class="row align-end">
                <div class="flex">
                    <h2 class="va-h2 va-text-primary"><router-link
                        style="color: inherit;"
                            :to="currentTaxon.leaves ? { name: 'taxon', params: { taxid: currentTaxon.taxid } } : { name: 'organism', params: { taxid: currentTaxon.taxid } }">{{
                                currentTaxon.name }}</router-link></h2>
                    <p class="mb-4">{{ currentTaxon.rank }}</p>
                </div>
            </div>
            <SideBar :name="currentTaxon?.name" :taxid="currentTaxon?.taxid" />
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { wiki } from '../../../config.json'
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
import { TreeNode } from '../../data/types'
import SideBar from './components/SideBar.vue'


const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'

const { t, locale } = useI18n()
const wikiMapper = wiki as Record<string, any>
const wikiURL = ref<string>(wikiMapper[locale.value])
const src = ref('')
const currentTaxon = ref<{
    taxid: string
    name: string
    rank: string
    leaves: number
} | null>(null)

watch(locale, () => {
    wikiURL.value = wikiMapper[locale.value]
    if (src.value && currentTaxon.value) src.value = `${wikiURL.value}/${currentTaxon.value.name}`
})
//wiki, organisms, map
const tabs = [
    {
        title: 'uiComponents.wikipedia',
        icon: 'wiki'
    },
    {
        title: 'modelStats.organisms',
        icon: 'fa-paw'
    }
]
const tabValue = ref(tabs[0].title)
function setCurrentTaxon(taxon: TreeNode) {
    currentTaxon.value = { ...taxon }
    src.value = `${wikiURL.value}/${currentTaxon.value.name}`
}



</script>
<style lang="scss">
.hypertree-wrapper {
    height: 100vh;
}
</style>