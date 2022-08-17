<template>
    <va-card>
        <va-card-title>
            Tree
        </va-card-title>
        <va-card-content>
            <!-- <div ref="tooltip" v-if="isNodeClicked" class="tooltip">
                <va-button-group size="small" outline>
                    <va-button icon="visibility"/>
                    <va-button icon="add_circle_outline" @click=""/>
                </va-button-group>
            </div> -->
            <svg ref="tree">
            </svg>
        </va-card-content>
    </va-card>
</template>
<script setup>
import { computed, onMounted, ref } from "vue";
import * as d3 from "d3";
import DataPortalService from "../../services/DataPortalService";

const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION
const ROOTNODE = import.meta.env.VITE_ROOT_NODE

const emits = defineEmits(['onSelected'])
const dx = 10
const dy = 144
const tree = ref(null)
const isNodeClicked = ref(false)
const selectedNode = ref(null)
const tooltip = ref(null)
const margin = ({top: 10, right: 120, bottom: 10, left: 60})
const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x)
const d3tree = d3.tree().nodeSize([dx, dy])
let gLink = null
let gNode = null
let root = null
let svg = null
const width = 864
let data = null
// const props = defineProps({
//     data: Object
// })

onMounted(()=>{
    tree.value.focus()
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
        data = resp.data
        createChart()
        update(data)
    })
})

function appendChildren(node, nameToFind, children){
    if (node.name === nameToFind){
        node.children = children
        return
    }
    for (const item of node.children) {
       if (item.children) {
          findObj(item.children, nameToFind, children);
          return
       }
    }
 };
function createChart(){
  root = d3.hierarchy(data);
  root.x0 = dy / 2;
  root.y0 = 0;
  root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
    if (d.depth) d.children = null;
  });

  svg = d3.select(tree.value)
      .attr("viewBox", [-margin.left, -margin.top, width, dx])
      .style("font", "10px sans-serif")
      .style("user-select", "none");

  gLink = svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5);

   gNode = svg.append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

}
function update(source) {
    const duration = d3.event && d3.event.altKey ? 2500 : 250;
    const nodes = root.descendants().reverse();
    const links = root.links();
    // Compute the new tree layout.
    d3tree(root);
    let left = root;
    let right = root;
    root.eachBefore(node => {
      if (node.x < left.x) left = node;
      if (node.x > right.x) right = node;
    });

    const height = right.x - left.x + margin.top + margin.bottom;

    const transition = svg.transition()
        .duration(duration)
        .attr("viewBox", [-margin.left, left.x - margin.top, width, height])
        .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

    // Update the nodes…
    const node = gNode.selectAll("g")
      .data(nodes, d => d.id);

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node.enter().append("g")
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", (event, d) => {
            DataPortalService.getTaxonChildren(d.data.taxid)
            .then(resp => {
                d._children = resp.data.children
                d.children = d._children;
                update(d);
            //     appendChildren(data,d.data.name,resp.data.children)
            //     console.log(data)
            //     update(data);
            })

        });

    nodeEnter.append("circle")
        .attr("r", 2.5)
        .attr("fill", d => d._children ? "#555" : "#999")
        .attr("stroke-width", 10);

    nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d._children ? -6 : 6)
        .attr("text-anchor", d => d._children ? "end" : "start")
        .text(d => d.data.name || d.data.title)
      .clone(true).lower()
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .attr("stroke", "white");

    // Transition nodes to their new position.
    const nodeUpdate = node.merge(nodeEnter).transition(transition)
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    const nodeExit = node.exit().transition(transition).remove()
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

    // Update the links…
    const link = gLink.selectAll("path")
      .data(links, d => d.target.id);

    // Enter any new links at the parent's previous position.
    const linkEnter = link.enter().append("path")
        .attr("d", d => {
          const o = {x: source.x0, y: source.y0};
          return diagonal({source: o, target: o});
        });

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition)
        .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition(transition).remove()
        .attr("d", d => {
          const o = {x: source.x, y: source.y};
          return diagonal({source: o, target: o});
        });

    // Stash the old positions for transition.
    root.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }
</script>