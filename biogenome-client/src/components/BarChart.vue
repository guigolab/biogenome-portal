<template>
{{orgStore.stats}}
    <va-card class="custom-card">
        <va-card-title>
            stats
        </va-card-title>
        <va-card-content style="padding:15px">
          <div ref="lpchart"/>
        </va-card-content>
    </va-card>
</template>
<script setup>
import {onMounted, reactive, ref, watch} from 'vue'
import {organisms} from '../stores/organisms'
import * as d3 from "d3";

import {dataIcons} from '../../config'


const orgStore = organisms()

const lpchart = ref(null)

onMounted(()=>{
  lpchart.value.focus()
  createLPChart()
})
watch(orgStore.stats, () => console.log(" value changed"),{deep:true});

// watch(orgStore.stats, () => {
//   console.log('YUHUU')
//    createLPChart()
// },{deep:true})
// set the dimensions and margins of the graph
const margin = {top: 10, right: 30, bottom: 40, left: 100},
    width = 350 - margin.left - margin.right,
    height = 350 - margin.top - margin.bottom;

function createLPChart(){
// append the svg object to the body of the page
  const svg = d3.select(lpchart.value)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
          `translate(${margin.left}, ${margin.top})`);

// Parse the Data
  const mappedData = Object.keys(orgStore.stats).map(k => { 
    return {label:k,value:orgStore.stats[k]}
  })
    // sort data
  mappedData.sort(function(b, a) {
    return a.value - b.value;
  });
    // Add X axis
const x = d3.scaleBand()
  .range([ 0, width ])
  .domain(mappedData.map(d => d.label))
  .padding(0.2);
svg.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(x))
  .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");

// Add Y axis
const y = d3.scaleLinear()
  .domain([0, orgStore.total])
  .range([ height, 0]);
svg.append("g")
  .call(d3.axisLeft(y));

// Bars
svg.selectAll("mybar")
  .data(mappedData)
  .join("rect")
    .attr("x", d => x(d.label))
    .attr("width", x.bandwidth())
    .attr("fill", "#69b3a2")
    // no bar at the beginning thus:
    .attr("height", d => height - y(0)) // always equal to 0
    .attr("y", d => y(0))

// Animation
svg.selectAll("rect")
  .transition()
  .duration(800)
  .attr("y", d => y(d.value))
  .attr("height", d => height - y(d.value))
  .delay((d,i) => {return i*100})

}
</script>