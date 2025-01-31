<template>
    <div>
        <div style="position: relative;">
            <div style="position: absolute;top: 100px" ref="taxonLegend"></div>
        </div>
        <div ref="hypertree"></div>

    </div>
</template>

<script setup lang="ts">
import * as hyt from 'd3-hypertree'
import { useTreeData } from '../composable/setTreeData'
import { onMounted, reactive, ref, watch } from 'vue'
import { useTaxonomyStore } from '../stores/taxonomy-store'
import { useToast } from 'vuestic-ui/web-components'
import * as d3 from 'd3'

// Define the type for your taxonomic rank legend
type TaxonomicRank = {
    rank: string;
    color: string;
};

const taxonomicRanks: TaxonomicRank[] = [
    { rank: "superkingdom", color: "#E57373" },         // Light Red
    { rank: "kingdom", color: "#F06292" },        // Pink
    { rank: "phylum", color: "#BA68C8" },         // Purple
    { rank: "subphylum", color: "#9575CD" },      // Light Purple
    { rank: "class", color: "#7986CB" },          // Light Blue
    { rank: "subclass", color: "#64B5F6" },       // Sky Blue
    { rank: "order", color: "#4FC3F7" },          // Cyan
    { rank: "superorder", color: "#4DD0E1" },     // Light Cyan
    { rank: "family", color: "#4DB6AC" },         // Teal
    { rank: "genus", color: "#81C784" },          // Green
    { rank: "species", color: "#AED581" },        // Light Green
    { rank: "other", color: "#455A64" },           // Amber
];

const { init } = useToast()
const hypertree = ref(null)
const taxonLegend = ref(null)
const taxonomyStore = useTaxonomyStore()

const hTree = reactive<{ tree: hyt.Hypertree | null }>({ tree: null })

const isInitializing = ref(true)

const emits = defineEmits(['nodeChange'])


watch(() => taxonomyStore.currentTaxon, (v) => {
    if (isInitializing.value || !v) return
    setPath(v.taxid)
})

watch(() => isInitializing.value, (v) => {
    if (taxonomyStore.currentTaxon && !v) setPath(taxonomyStore.currentTaxon.taxid)
})

function setPath(taxid: string) {
    if (!hTree.tree) return

    const node = findNode(taxid, hTree.tree.data)

    if (hTree.tree.data.pathes.partof)
        removePath(hTree.tree.data.pathes.partof[0].head)
    if (node) {
        addPath(node)
        hTree.tree.api.gotoNode(node as hyt.N).then(() => hTree.tree?.drawDetailFrame())
        taxonomyStore.isOutOfBoundaries = false
    } else {
        taxonomyStore.isOutOfBoundaries = true
        init({ message: `${taxonomyStore.currentTaxon?.name} is not under ${taxonomyStore.treeData?.name}`, color: 'warning' })
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

    // Create an SVG container for the legend
    const svg = d3.select(taxonLegend.value).append("svg").attr("width", 200).attr("height", 300);

    createTaxonomicRankLegend(svg.append("g").attr("transform", "translate(10, 10)") as any, taxonomicRanks);
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
                n.precalc.label = `${n.data.data.name} (${n.data.data.rank})`;
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
                    labels: {
                        color: (n: N) => getColor(n)
                    },
                    links: {
                        stroke: (n: N) => {
                            return '#a5d6a710'
                        },
                        strokeWidth: (n: N) => 10,
                    },

                },
                nodeRadius: (ud, n) => n.parent ? .025 : .05,
            },
            interaction: {
                onNodeClick: (n: hyt.N, m, l) => {
                    emits('nodeChange', n.data.data)
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

function getColor(n: hyt.N) {
    return taxonomicRanks.find(({ rank }) => rank === n.data.data.rank)?.color ?? '#aad3df'
}
//override 
function addPath(n: hyt.N) {
    const newpath = {
        type: "",
        id: 'button-path',
        icon: 'place',
        head: n,
        headName: n.precalc.label,
        ancestors: n.ancestors(),
        color: getColor(n),
    };
    // model mod
    n.pathes.headof = newpath;
    n.pathes.finalcolor = n.pathes.labelcolor = newpath.color;
    // model mod: node context        
    n.ancestors().forEach((pn: hyt.N) => {
        pn.pathes.partof = [newpath]
        pn.pathes.finalcolor = newpath.color;
    });
    return newpath;
}

function removePath(n: hyt.N) {
    // model mod
    n.pathes.head = undefined
    n.pathes.finalcolor = undefined;
    n.pathes.labelcolor = undefined
    // model mod: node context        
    n.ancestors().forEach((pn: hyt.N) => {
        pn.pathes.partof = [];
        pn.pathes.finalcolor = undefined;
    });
}

function createTaxonomicRankLegend(
    container: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    ranks: TaxonomicRank[]
) {
    const legendGroup = container.append("g").attr("class", "taxonomic-rank-legend");

    ranks.forEach((rank, i) => {
        const legendRow = legendGroup
            .append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendRow
            .append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", rank.color);

        legendRow
            .append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(rank.rank)
            .attr("font-size", "inherit")
            .attr("alignment-baseline", "middle");
    });
}
</script>
<style lang="scss">
@import '../styles/d3-hypertree-light.css';


.unitdisk-nav svg {
    position: inherit;
}

.unitdisk-nav {
    background-color: var(--va-background-primary);
}
</style>