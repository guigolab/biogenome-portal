<template>
    <div style="height: 100vh;" ref="hypertree"></div>
</template>

<script setup lang="ts">
import * as hyt from 'd3-hypertree'
import TaxonService from '../../services/clients/TaxonService'
import { useTreeData } from './setTreeData'
import {  onMounted, reactive, ref, watch } from 'vue'
import { TreeNode } from '../../data/types'


const hypertree = ref(null)

const props = defineProps<{
    filter: string | null
}>()

const hTree = reactive<{ tree: hyt.Hypertree | null }>({ tree: null })

const { data } = await TaxonService.getComputedTree()

const { root } = useTreeData(data.tree)

const isInitializing = ref(true)

const emits = defineEmits(['nodeChange'])

watch(() => props.filter, (v) => {
    console.log(v)
    console.log("FIlter..")
    if (isInitializing.value || !v) return
    setPath(v)
})

watch(() => isInitializing.value, (v) => {
    console.log(v)
    console.log("Init..")
    if (props.filter && !v) setPath(props.filter)
})

function setPath(taxid: string) {
    if (hTree.tree) {
        const node = findNode(taxid, hTree.tree.data)
        if (node) {
            hTree.tree.api.setPathHead(hTree.tree.data.pathes, node)
            hTree.tree.api.gotoNode(node).then(() => hTree.tree.drawDetailFrame())
        }
    }

}

onMounted(() => {
    hTree.tree = createTree(root)
    hTree.tree.initPromise
        .then(() => new Promise((ok, err) => hTree.tree.animateUp(ok, err)))
        .then(() => hTree.tree.drawDetailFrame())
        .catch((err) => console.log(err))
        .finally(() => isInitializing.value = !isInitializing.value)

    // .then(() => {
    //     if (props.filter) {
    //         setPath(props.filter)
    //     }
    // })
})

function createTree(data) {

    const mytree = new hyt.Hypertree(
        { parent: hypertree.value },
        {
            dataloader: ok => ok(data),
            langInitBFS: (ht, n) => {
                n.precalc.label = `${n.data.data.name} (${n.data.data.rank})`
            },
            filter: {
                maxlabels: 15,
            },
            geometry: {
                layerOptions: {
                    nodes: {
                        strokeWidth: n => n.parent ? .1 : .001,
                        stroke: n => {
                            if (n.hasOutChildren) return '#ff000010' // has filtered children
                            if (!n.parent) return '#999' // root
                            return '#a5d6a710' // default green (leafes)
                        },
                    },
                },
                nodeRadius: (ud, n) => n.parent ? .025 : .05,
            },
            interaction: {
                onNodeClick: (n, m, l) => {

                    mytree.api.setPathHead(mytree.data.pathes, n)
                    mytree.api.goto({ re: -n.layout.z.re, im: -n.layout.z.im }, null)
                        .then(() => l.view.hypertree.drawDetailFrame())
                    emits('nodeChange', n.data.data as TreeNode)


                }
            }
        }
    )
    return mytree
}

function findNode(taxid: string, node: hyt.N): hyt.N | null {
    // Check if the current node matches the specified name
    if (node.data.data.taxid === taxid) {
        return node;
    }

    // Recursively search through the children of the current node
    if (!node.children) return null
    for (const child of node.children) {
        const foundNode = findNode(taxid, child);
        if (foundNode !== null) {
            return foundNode;
        }
    }

    // If the node is not found in this subtree, return null
    return null;
}

</script>
<style lang="scss">
@import '../../styles/d3-hypertree-light.css';
</style>