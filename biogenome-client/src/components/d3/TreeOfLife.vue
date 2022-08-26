<template>
<div class="row">
    <div class="flex lg12 md12 sm12 xs12">
        <va-card class="custom-card">
            <va-card-title>
                <div class="row justify--space-between align--center">
                    <div class="flex">
                        Tree of Life
                    </div>
                    <div class="flex">
                        <va-button-dropdown
                            size="small"
                            split
                            outline
                            :label="`download ${downloadType}`"
                            @main-button-click="downloadType === 'svg' ? downloadSVGImage():downloadPGNImage()"
                        >
                        <ul>
                            <li>
                                <va-button @click="downloadType='svg'" flat>
                                    SVG
                                </va-button>
                            </li>
                            <li>
                                <va-button @click="downloadType='png'" flat>
                                    PNG
                                </va-button>
                            </li>
                        </ul>
                        </va-button-dropdown>
                    </div>
                </div>
            </va-card-title>
            <va-card-content>
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
import { useRouter } from "vue-router";
import { Canvg } from 'canvg';

const router = useRouter()
var level = ref(0)
var linkExtension = null
var link = null
var legendDomains = reactive([])
const props = defineProps({
    // node:String,
    data:Object
})
const width = ref(650)
const outerRadius = computed(()=>width.value/2)
const innerRadius = computed(()=> outerRadius.value - 170)
const legendPosition =  computed(()=> -outerRadius.value)
const downloadType = ref('svg')
const stack = reactive([])
// var data = null
var domains = reactive([])
const tree=ref(null)
const treegroup = ref(null)
const domainleg = ref(null)
// const canvas = ref(null)

watch(width, ()=>{
    createD3Tree(data)
})

onMounted(()=>{
    tree.value.focus()         
    treegroup.value.focus()
    domainleg.value.focus()
    // canvas.value.focus()
    // getTree(props.node)
    const doms = getDomains(props.data,[])
    legendDomains = doms.slice(0,9)
    domains = legendDomains.map(v => v.name)
    createD3Tree(props.data)
})

function downloadSVGImage(){
    const svg = tree.value.cloneNode(true); // clone your original svg
    // document.body.appendChild(svg); // append element to document
    const g = svg.querySelector('g') // select the parent g
    g.setAttribute('transform', '') // clean transform
    svg.setAttribute("background-color","white")
    g.setAttribute("background-color","white")
    console.log(svg)
    console.log(g)
    
    // svg.setAttribute('display', 'none') // set svg to be the g dimensions
    // svg.setAttribute('height', g.getBBox().height)
    const svgAsXML = (new XMLSerializer).serializeToString(svg);
    const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`
    const link = document.createElement("a");
    // document.body.appendChild(link); 
    link.setAttribute("href", svgData);
    link.setAttribute("download", "image.svg");
    link.click();
}

function downloadPGNImage() {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const svgAsXML = new XMLSerializer().serializeToString(tree.value);
    ctx.canvas.width = 2000
    ctx.canvas.height = 2000
    const v = Canvg.fromString(ctx,svgAsXML)
    v.start()
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, ctx.canvas.width,ctx.canvas.height)
    // const image = new Image()
    // image.src = canvas.value.toDataURL("image/png")
    const link = document.createElement("a")
    // document.body.appendChild(link); 
    link.setAttribute("href", canvas.toDataURL("image/png"))
    link.setAttribute("download", "image.png")
    link.click();
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
    .attr("font-size", 8)
    .attr("background-color","white");

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

    const gLegend = d3.select(domainleg.value)
    .attr("font-family", "sans-serif")
    .attr("font-size", 6)
    .attr("background-color","white");


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
    .attr("stroke", d => d.target.color);


    g.append("g")
    .selectAll("text")
    .data(root.leaves())
    .join("text")
    .attr("dy", ".31em")
    .attr("transform", d => `rotate(${d.x - 90}) translate(${innerRadius.value + 4},0)${d.x < 180 ? "" : " rotate(180)"}`)
    .attr("text-anchor", d => d.x < 180 ? "start" : "end")
    .attr("class","leaves-class")
    .text(d => d.data.name.replace(/_/g, " "))
    .on("mouseover", mouseovered(true))
    .on("mouseout", mouseovered(false));
}

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
    .attr("x", 20)
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

</style>