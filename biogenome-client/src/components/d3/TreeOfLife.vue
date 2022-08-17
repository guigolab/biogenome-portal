<template>
<div class="row">
    <div class="flex lg12 md12 sm12 xs12">
        <va-card class="custom-card">
            <va-card-title>Tree of Life</va-card-title>
            <va-card-content>
                <div ref="tooltip" class="tooltip"></div>
                <svg ref="tree">
                    <g ref="domainleg"/>
                    <g ref="treegroup"/>
                </svg>
            </va-card-content>
        </va-card>
    </div>
</div>

</template>
<script setup>
import {reactive, onMounted, watch, ref, nextTick, computed} from "vue";
import * as d3 from "d3";
import DataPortalService from "../../services/DataPortalService";
import { useRouter } from "vue-router";

const router = useRouter()
var level = ref(0)
var linkExtension = null
var link = null
var legendDomains = reactive([])
const props = defineProps({
    node:String
})
const width = ref(1000)
const outerRadius = computed(()=>width.value/2)
const innerRadius = computed(()=> outerRadius.value - 170)
const legendPosition =  computed(()=> -outerRadius.value)

const stack = reactive([])
var data = null
var domains = reactive([])
const tree=ref(null)
const tooltip=ref(null)
const treegroup = ref(null)
const domainleg = ref(null)


watch(width, ()=>{
    createD3Tree(data)
})

onMounted(()=>{
    tree.value.focus()
    tooltip.value.focus()
    treegroup.value.focus()
    domainleg.value.focus()
    getTree(props.node)
})

watch(props.node,(value)=>{
    getTree(value)
})

function getTree(node){
    DataPortalService.getTree(node)
    .then(response => {
        data = response.data
        nextTick(()=>{
          const doms = getDomains(data,[])
          legendDomains = doms.slice(0,9)
          domains = legendDomains.map(v => v.name)
          createD3Tree(data)
        })
    })
}


function createD3Tree(data){
    const root = d3.hierarchy(data , d => d.children)
      .sum(d => d.children ? 0 : 1)
      .sort((a, b) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length));
    var cluster = radialCluster();
    cluster(root);
    setRadius(root, root.data.length = 0, innerRadius.value / maxLength(root));
    setColor(root)
    const svg = d3.select(tree.value)
    .attr("viewBox", [-outerRadius.value, -outerRadius.value, width.value, width.value])
    const g = d3.select(treegroup.value)
    .attr("font-family", "sans-serif")
    .attr("font-size", 7);

    g.append("style").text(`
    .link--active {
        stroke: #000 !important;
        stroke-width: 1.5px;
    }
    .link-extension--active {
        stroke-opacity: .6;
    }
    .label--active {
        font-weight: bold;
    }
    `);
    var div = d3.select(tooltip.value)
    .style("opacity", 0)

    const gLegend = d3.select(domainleg.value)
    .attr("font-family", "sans-serif")
    .attr("font-size", 10);

    legend(gLegend)

    linkExtension = g.append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0.25)
    .selectAll("path")
    .data(root.links().filter(d => !d.target.children))
    .join("path")
    .each(function(d) { d.target.linkExtensionNode = this; })
    .attr("d", linkExtensionConstant);

    link = g.append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .selectAll("path")
    .data(root.links())
    .join("path")
    .each(function(d) { d.target.linkNode = this; })
    .attr("d", linkConstant)
    .attr("stroke", d => d.target.color)
    .on("mouseover", function(event, d){
        console.log(d)
        div.transition()		
        .duration(200)		
        .style("opacity", .9);		
        div.html( `${d.data.name} (${d.data.rank})`)	
        .style("left", (event.layerX) + "px")		
        .style("top", (event.layerY-15) + "px");	
    })
    .on("mouseout", function() {
        div.transition()		
            .duration(500)		
            .style("opacity", 0);	
    })
    .on("click", function(event,d){
        getData(d.data)
    });
    g.append("g")
    .selectAll("text")
    .data(root.leaves())
    .join("text")
    .attr("dy", ".31em")
    .attr("transform", d => `rotate(${d.x - 90}) translate(${innerRadius.value + 4},0)${d.x < 180 ? "" : " rotate(180)"}`)
    .attr("text-anchor", d => d.x < 180 ? "start" : "end")
    .attr("class","leaves-class")
    .text(d => d.data.name.replace(/_/g, " "))
    .on("click",test(this))
    .on("mouseover", mouseovered(true))
    .on("mouseout", mouseovered(false));
}
function test(test){
    console.log(test)
}

const getData = taxon => {
    console.log(router)
    router.push({name:'taxons',params:{taxid:taxon.taxid}})
}

// function getData(taxon){
//     console.log(taxon)
//     const name = taxon.name || taxon
//     if(taxon.rank === 'species' || taxon.rank === 'subspecies'){
//         router.push({name:'organisms',params:{taxid:taxon.taxid}})
//     }
//     else {
//         router.push({name:'taxons',params:{taxid:taxon.taxid}})
//     }
// }
function getDomains(node,domains) {
    if(node.children){
    node.children.forEach(n => {
        domains = getDomains(n,domains)
        })
    if (node.children.length > 1)
        domains.push(node)
    }
    return domains.sort((a,b) => b.leaves-a.leaves)
}

function maxLength(d) {
    return d.data.length + (d.children ? d3.max(d.children, maxLength) : 0);
}

function mouseovered(active) {
    return function(event, d) {
    d3.select(this).classed("label--active", active);
    d3.select(d.linkExtensionNode).classed("link-extension--active", active).raise();
    do {
        d3.select(d.linkNode).classed("link--active", active).raise();
        d = d.parent;
    }
    while (d);
    };
}
function setRadius(d, y0, k) {
    d.radius = (y0 += d.data.length) * k;
    if (d.children) d.children.forEach(d => setRadius(d, y0, k));
}

function setColor(d) {
    var name = d.data.name;
    d.color = color().domain().indexOf(name) >= 0 ? color()(name) : d.parent ? d.parent.color : null;
    if (d.children){
        d.children.forEach((item) => {
            setColor(item)});
        }
}

function linkVariable(d) {
      return linkStep(d.source.x, d.source.radius, d.target.x, d.target.radius);
    }
function linkConstant(d) {
      return linkStep(d.source.x, d.source.y, d.target.x, d.target.y);
    }
function linkExtensionVariable(d) {
      return linkStep(d.target.x, d.target.radius, d.target.x, innerRadius.value);
    }
function linkExtensionConstant(d) {
      return linkStep(d.target.x, d.target.y, d.target.x, innerRadius.value);
    }

function linkStep(startAngle, startRadius, endAngle, endRadius) {
      const c0 = Math.cos(startAngle = (startAngle - 90) / 180 * Math.PI);
      const s0 = Math.sin(startAngle);
      const c1 = Math.cos(endAngle = (endAngle - 90) / 180 * Math.PI);
      const s1 = Math.sin(endAngle);
      return "M" + startRadius * c0 + "," + startRadius * s0
          + (endAngle === startAngle ? "" : "A" + startRadius + "," + startRadius + " 0 0 " + (endAngle > startAngle ? 1 : 0) + " " + startRadius * c1 + "," + startRadius * s1)
          + "L" + endRadius * c1 + "," + endRadius * s1;
    }

function getFirstFork(node) {
    if(node.children.length > 1){
        return node
    }else if(node.children){
        var childNode = null
        node.children.forEach(n => {
            childNode = getFirstFork(n)
            })
        return childNode
    }
}
function color() {
    const color = d3.scaleOrdinal()
    .domain(domains)
    .range(d3.schemeCategory10)
    return color
    }

function radialCluster(){
    return d3.cluster()
    .size([360, innerRadius.value])
    .separation(() => 1)   
    }

function legend(svg){
    const g = svg
    .selectAll("g").text('').attr('fill',null).attr('stroke',null)
    .data(color().domain())
    .join("g")
    .attr("transform", (d, i) => `translate(${-outerRadius.value},${legendPosition.value + i * 20})`);
    g.append("rect")
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", color());
    g.append("text")
    .attr("x", 24)
    .attr("y", 9)
    .attr("dy", "0.35em")
    .attr("class","legend-text")
    .text(d =>d +' ('+ legendDomains.find(value => value.name === d).rank +')')
    .on("click", function(event,d){
        getData(d.data)
    })
    .on("mouseover", mouseovered(true))
    .on("mouseout", mouseovered(false))
}

</script>

<style scoped>
.leaves-class {
  cursor: pointer;
  font-size: 0.8rem;
  /* font-size: inherit; */
}
.tree-svg {
    width: inherit;
    height: 100%;
    /* max-width: 100%; */
    overflow: visible;
}
.tooltip {	
  position: absolute;			
  text-align: center;			
  width: min-content;					
  background: black;	
  border: 0px;		
  color: white;
  border-radius: 8px;			
  pointer-events: none;			
}
</style>