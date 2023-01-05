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
                <div ref="tooltip" class="tooltip">
                    <va-card stripe :stripe-color="selectedNode.color" v-if="showDetails" class="box" style="padding:10px">
                        <div class="row align--center justify--space-between">
                            <div class="flex">
                                <p style="text-align:start;font-size: 16px;">{{`${selectedNode.name} (${selectedNode.rank})`}}</p>
                            </div>
                            <div class="flex">
                                <va-icon @click="showDetails=false" name="close"/>
                            </div>
                        </div>
                        <va-divider/>
                        <div class="row">
                            <div class="flex text--secondary" style="font-size: 16px;">
                                <p style="text-align:start">{{`taxid: ${selectedNode.taxid}`}}</p>
                            </div>
                        </div>
                        <div v-if="selectedNode.leaves" class="row">
                            <div class="flex text--secondary" style="font-size: 16px;">
                                <p style="text-align:start">{{`organisms: ${selectedNode.leaves}`}}</p>
                            </div>
                        </div>
                        <va-divider/>
                        <div class="row align--center justify--space-between">
                            <div class="flex">
                                <va-button size="small" outline @click="toPageDetails({name:'taxons', params:{id:selectedNode.taxid}})">Details</va-button>
                            </div>
                            <div v-if="selectedNode.leaves" class="flex">
                                <va-button size="small" outline :to="{name:'tree', params: {taxid: selectedNode.taxid}}">Tree</va-button>
                            </div>
                        </div>                                            
                    </va-card>
                </div>
                <svg class="tree-svg" ref="tree">
                </svg>
            </va-card-content>
        </va-card>
    </div>
</div>

</template>
<script setup>
import {reactive, onMounted, ref, computed} from "vue";
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
const width = ref(954)
const tooltip = ref(null)
const showDetails = ref(false)
const outerRadius = computed(()=>width.value/2)
const innerRadius = computed(()=> outerRadius.value - 170)
const legendPosition =  computed(()=> -outerRadius.value)
const downloadType = ref('svg')
const stack = reactive([])
var domains = reactive([])
const tree=ref(null)
const selectedNode = ref({})
onMounted(()=>{
    tree.value.focus()         
    tooltip.value.focus()
    createD3Tree(props.data)
})

function downloadSVGImage(){
    const svg = tree.value.cloneNode(true); // clone your original svg
    const g = svg.querySelector('g') // select the parent g
    g.setAttribute('transform', '') // clean transform
    svg.setAttribute("background-color","white")
    g.setAttribute("background-color","white")
    const svgAsXML = (new XMLSerializer).serializeToString(svg);
    const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`
    const link = document.createElement("a");
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
    const link = document.createElement("a")
    link.setAttribute("href", canvas.toDataURL("image/png"))
    link.setAttribute("download", "image.png")
    link.click();
}


function createD3Tree(data){
    const root = d3.hierarchy(data , d => d.children)
    root
      .sum(d => d.children ? 0 : 1)
      .sort((a, b) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length));
      const doms = root.descendants().sort((a,b) =>  b.height - a.height)
      var countList = doms.reduce(function(p, c){
        p[c.height] = (p[c.height] || 0) + 1;
        return p;
        }, {});
        var result = doms.filter(function(obj){
            return countList[obj.height] > 1;
            });
      legendDomains = [doms[0]].concat(result.slice(0,4)).map(d => d.data)
      domains = legendDomains.map(d => d.name)
    var cluster = radialCluster();
    cluster(root);
    setRadius(root, root.data.length = 0, innerRadius.value / maxLength(root));
    setColor(root)
    const svg = d3.select(tree.value)
    .attr("viewBox", [-outerRadius.value, -outerRadius.value, width.value, width.value])
    .attr("font-family", "sans-serif")
    .attr("font-size", 10);  

    svg.append("style").text(`
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

    const div = d3.select(tooltip.value)
    // .style("opacity", 0)

    svg.append("g").call(legend)

    linkExtension = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0.25)
    .selectAll("path")
    .data(root.links().filter(d => !d.target.children))
    .join("path")
    .each(function(d) { d.target.linkExtensionNode = this; })
    .attr("d", linkExtensionConstant);

    link = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .selectAll("path")
    .data(root.links())
    .join("path")
    .each(function(d) { d.target.linkNode = this; })
    .attr("d", linkConstant)
    .attr("stroke", d => d.target.color)
    .on("click", function(event,d){
        selectedNode.value = d.target.data
        selectedNode.value.color = d.target.color
        div.style("left", (event.layerX) + "px")		
        .style("top", (event.layerY-15) + "px")
        showDetails.value=true
    });

    svg.append("g")
    .selectAll("text")
    .data(root.leaves())
    .join("text")
    .attr("dy", ".31em")
    .attr("transform", d => `rotate(${d.x - 90}) translate(${innerRadius.value + 4},0)${d.x < 180 ? "" : " rotate(180)"}`)
    .attr("text-anchor", d => d.x < 180 ? "start" : "end")
    .attr("class","leaves-class")
    .text(d => d.data.name.replace(/_/g, " "))
    .on("mouseover", mouseovered(true))
    .on("mouseout", mouseovered(false))
    .on("click", function(event,d){
        selectedNode.value = d.data
        selectedNode.value.color = d.color
        div.style("left", (event.layerX) + "px")		
        .style("top", (event.layerY-15) + "px")
        showDetails.value=true
    })
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

function linkConstant(d) {
      return linkStep(d.source.x, d.source.y, d.target.x, d.target.y);
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
    const div = d3.select(tooltip.value)
    const g = svg
    .selectAll("g").text('').attr('fill',null).attr('stroke',null)
    .data(color().domain())
    .join("g")
    .attr("transform", (d, i) => `translate(${-outerRadius.value},${-outerRadius.value + i * 20})`);
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
        const selectedDomain = legendDomains.find(value => value.name === d)
        selectedNode.value = {...selectedDomain}
        selectedNode.value.color = color()(d)
        div.style("left", (event.layerX) + "px")		
        .style("top", (event.layerY-15) + "px")
        showDetails.value=true
    })
    .on("mouseover", mouseovered(true))
    .on("mouseout", mouseovered(false))
}

//return object with level and number of nodes at each level
function leveledTree(node, leveledTreeObj) {
  if(leveledTreeObj[node.height]) {
    leveledTreeObj[node.height]++
  } else {
    leveledTreeObj[node.height] = 1
  }
  if(node.children) {
    node.children.forEach(n => leveledTree(n, leveledTreeObj))
  }
  return leveledTreeObj
}

function toPageDetails(route){
    router.push(route)
}
</script>

<style scoped>
.leaves-class, .legend-text {
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
  min-width: 300px;	
}
</style>