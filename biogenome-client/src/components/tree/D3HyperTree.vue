<template>
    <va-card>
        <va-card-content>
            <div class="row row-equal">
                <div class="flex lg8 md7 sm12 xs12" style="height: 100vh;">
                    <va-card style="box-shadow: none;" :bordered="false">
                        <div ref="hypertree"></div>
                    </va-card>
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
                        <div v-if="tabValue === 'Wikipedia'" style="overflow: scroll;">
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
import { useTreeData } from './setTreeData'
import { onMounted, reactive, ref } from 'vue'
import TaxonDetailsListBlock from '../../pages/taxons/TaxonDetailsListBlock.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const accordionTab = ref([true, false])
const hypertree = ref()
const src = ref('')
const currentTaxon = reactive({
    taxid: '',
    name: '',
    rank: '',
    leaves: ''
})
const props = defineProps<{
    taxid: string
}>()
const { data } = await TaxonService.getTree(props.taxid)
const { root } = useTreeData(data)
const tabs = [
    {
        title: 'Wikipedia',
        icon: 'wiki'
    },
    {
        title: 'modelStats.organisms',
        icon: 'fa-paw'
    }
]
const tabValue = ref(tabs[0].title)
onMounted(() => {
    hypertree.value.focus()
    const hyperTree = new hyt.Hypertree(
        {
            parent: hypertree.value
        },
        {
            dataloader: ok => ok(root),
            langInitBFS: (ht, n) => {
                n.precalc.label = n.data.data.name
            },
            interaction: {
                onCenterNodeChange(n) {
                    const name = n.data.data.name
                    currentTaxon.name = name
                    currentTaxon.taxid = n.data.data.taxid
                    currentTaxon.rank = n.data.data.rank
                    currentTaxon.leaves = n.data.data.leaves
                    src.value = `https://en.m.wikipedia.org/wiki/${n.data.data.name}`
                },
                onNodeSelect(n) {
                    const name = n.data.data.name
                    currentTaxon.name = name
                    currentTaxon.taxid = n.data.data.taxid
                    currentTaxon.rank = n.data.data.rank
                    currentTaxon.leaves = n.data.data.leaves
                    src.value = `https://en.m.wikipedia.org/wiki/${n.data.data.name}`
                }
            }
        }
    )
    hyperTree.initPromise
        .then(() => new Promise((ok, err) => hyperTree.animateUp(ok, err)))
        .then(() => hyperTree.drawDetailFrame())
})


</script>
<style lang="scss">
@import '../../styles/d3-hypertree-light.css';

@media all and (max-width: 576) {
    #tree-row {
        flex-direction: column-reverse;
    }
}
</style>