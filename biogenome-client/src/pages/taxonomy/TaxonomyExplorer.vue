<template>
    <va-card style="min-height: 90vh;">
        <va-card-content>
            <div class="row row-equal">
                <div class="flex lg8 md7 sm12 xs12">
                    <Suspense>
                        <template #fallback>
                            <va-skeleton height="inherit" />
                        </template>
                        <D3HyperTree :taxid="rootNode" @node-change="setCurrentTaxon" />
                    </Suspense>
                </div>
                <div v-if="currentTaxon" class="flex lg4 md5 sm12 xs12">
                    <va-card style="box-shadow: none;" :bordered="false">
                        <h2 class="va-h2">{{ currentTaxon.name }}</h2>
                        <p>{{ currentTaxon.rank }}</p>
                        <div class="row justify-end">
                            <div class="flex">
                                <va-button-toggle icon-color="primary" round v-model="tabValue" preset="secondary"
                                    border-color="primary" :options="tabs" value-by="title"
                                    :text-by="(option: Record<string, string>) => t(option.title)" />
                            </div>
                        </div>
                        <va-divider />
                        <div v-if="tabValue === 'uiComponents.wikipedia'" style="overflow: scroll;">
                            <iframe style="width: 100%;height: 100vh;" :src="src" :key="src"></iframe>
                        </div>
                        <TaxonDetailsListBlock v-else :key="currentTaxon.taxid" :taxid="currentTaxon.taxid" />
                    </va-card>
                </div>
                <div v-else>
                    <va-skeleton height="100vh"></va-skeleton>
                </div>
            </div>
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import TaxonDetailsListBlock from '../../pages/taxons/TaxonDetailsListBlock.vue'
import { useI18n } from 'vue-i18n'
import { wiki } from '../../../config.json'
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
import { TreeNode } from '../../data/types'

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
    console.log(taxon)
    currentTaxon.value = { ...taxon }
    src.value = `${wikiURL.value}/${currentTaxon.value.name}`
}



</script>
<style lang="scss">

</style>