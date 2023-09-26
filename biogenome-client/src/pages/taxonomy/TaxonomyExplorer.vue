<template>
    <va-card>
        <va-card-content>
            <div class="row row-equal">
                <div class="flex lg8 md7 sm12 xs12" style="height: 100vh;">
                    <Suspense>
                        <template #fallback>
                            <va-skeleton height="inherit" />
                        </template>
                        <D3HyperTree :taxid="'9606'" @node-change="setCurrentTaxon" />
                    </Suspense>
                </div>
                <div class="flex lg4 md5 sm12 xs12">
                    <va-card style="box-shadow: none;" :bordered="false">
                        <h2 class="va-h2">{{ currentTaxon.name }}</h2>
                        <p>{{ currentTaxon.rank }}</p>
                        <div class="row justify-end">
                            <div class="flex">
                                <va-button-toggle icon-color="primary" round v-model="tabValue" preset="secondary"
                                    border-color="primary" :options="tabs" value-by="title"
                                    :text-by="(option) => t(option.title)" />
                            </div>
                        </div>
                        <va-divider />
                        <div v-if="tabValue === 'uiComponents.wikipedia'" style="overflow: scroll;">
                            <iframe style="width: 100%;height: 100vh;" :src="src" :key="src"></iframe>
                        </div>
                        <TaxonDetailsListBlock v-else :key="currentTaxon.taxid" :taxid="currentTaxon.taxid" />
                    </va-card>
                </div>
            </div>
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import * as hyt from 'd3-hypertree'
import TaxonService from '../../services/clients/TaxonService'
import { onMounted, reactive, ref, watch } from 'vue'
import TaxonDetailsListBlock from '../../pages/taxons/TaxonDetailsListBlock.vue'
import { useI18n } from 'vue-i18n'
import { wiki } from '../../../config.json'
import treeData from '../../data/treeEBP.json'
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
import { TreeNode } from '../../data/types'

const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'

const { t, locale } = useI18n()
const wikiMapper = wiki as Record<string, any>
const wikiURL = ref<string>(wikiMapper[locale.value])
const hypertree = ref()
const src = ref('')
const currentTaxon = ref({
    taxid: '',
    name: '',
    rank: '',
    leaves: ''
})
watch(locale, () => {
    wikiURL.value = wikiMapper[locale.value]
    if (src.value) src.value = `${wikiURL.value}/${currentTaxon.name}`
})

const props = defineProps<{
    taxid: string
}>()
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


}
onMounted(() => {

})


</script>
<style lang="scss"></style>