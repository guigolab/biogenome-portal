<template>
    <va-card style="box-shadow: none;" :bordered="false">
        <div ref="hypertree"></div>
    </va-card>
</template>

<script setup lang="ts">
import * as hyt from 'd3-hypertree'
import TaxonService from '../../services/clients/TaxonService'
import { useTreeData } from './setTreeData'
import { onMounted, ref } from 'vue'
import {TreeNode} from '../../data/types'


const hypertree = ref()

const props = defineProps({
    taxid:String
})


const { data } = await TaxonService.getTree(props.taxid)
const { root } = useTreeData(data)
const emits = defineEmits(['nodeChange'])

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
                    emits('nodeChange', n.data.data as TreeNode)
                }
                // onNodeSelect(n) {
                //     const name = n.data.data.name
                //     currentTaxon.name = name
                //     currentTaxon.taxid = n.data.data.taxid
                //     currentTaxon.rank = n.data.data.rank
                //     currentTaxon.leaves = n.data.data.leaves
                //     src.value = `${wikiURL.value}/${n.data.data.name}`
                // }
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

</style>