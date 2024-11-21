<template>
    <div ref="hypertree"></div>
</template>

<script setup lang="ts">
import * as hyt from 'd3-hypertree'
import { useTreeData } from './setTreeData'
import { onMounted, reactive, ref, watch } from 'vue'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { useItemStore } from '../../stores/items-store'
import { useToast } from 'vuestic-ui/web-components'

const { init } = useToast()
const hypertree = ref(null)
const taxonomyStore = useTaxonomyStore()
const itemStore = useItemStore()

const hTree = reactive<{ tree: hyt.Hypertree | null }>({ tree: null })

const isInitializing = ref(true)

const emits = defineEmits(['nodeChange'])


watch(() => itemStore.parentTaxon, (v) => {
    if (isInitializing.value || !v) return
    setPath(v.taxid)
})

watch(() => isInitializing.value, (v) => {
    if (itemStore.parentTaxon && !v) setPath(itemStore.parentTaxon.taxid)
})

function setPath(taxid: string) {
    if (!hTree.tree) return

    const node = findNode(taxid, hTree.tree.data)

    if (node) {
        hTree.tree.api.setPathHead(hTree.tree.data.pathes as any, node as any)
        hTree.tree.api.gotoNode(node as hyt.N).then(() => hTree.tree?.drawDetailFrame())
        taxonomyStore.isOutOfBoundaries = false
    } else {
        taxonomyStore.isOutOfBoundaries = true
        init({ message: `${itemStore.parentTaxon?.name} is not under ${taxonomyStore.treeData?.name}`, color: 'warning' })
    }
}

async function initTree() {
    if (!taxonomyStore.treeData) await taxonomyStore.getTree()

    const { root } = useTreeData(taxonomyStore.treeData)
    hTree.tree = createTree(root)
    hTree.tree.initPromise
        .then(() => new Promise((ok, err) => hTree.tree?.animateUp(ok, err)))
        .then(() => hTree.tree?.drawDetailFrame())
        .catch((err) => console.log(err))
        .finally(() => isInitializing.value = !isInitializing.value)
}

onMounted(async () => {
    await initTree()
})

function createTree(data: any) {

    const mytree = new hyt.Hypertree(
        { parent: hypertree.value as any },
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
                    emits('nodeChange', n.data.data)
                    mytree.api.setPathHead(mytree.data.pathes, n)
                    mytree.api.goto({ re: -n.layout.z.re, im: -n.layout.z.im }, null)
                        .then(() => l.view.hypertree.drawDetailFrame())
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


.unitdisk-nav svg {
    position: inherit;
}

.unitdisk-nav {
    background-color: var(--va-background-primary);
}
</style>