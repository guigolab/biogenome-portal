<template>
  <b-container>
  <b-row>
    <b-col>
          <b-row>
            <b-col style="min-height:600px">
              <h1 style="text-align:center">{{node}}</h1>
              <b-form-input debounce="500" id="range-1" v-model="maxNodes" type="range" :disabled="data && data.leaves < 30" :min="data && data.leaves < 30 ? data.leaves : '30'" :max="data && data.leaves < 150 ? data.leaves : '150'"></b-form-input>
              <div class="mt-2">Leaves limit: {{ maxNodes }}</div>
              <div ref="tooltip" class="tooltip"></div>
              <svg ref="svg"  class="tree-svg"></svg>
            </b-col>
          </b-row>
    </b-col>
  </b-row>
</b-container>
</template>

<script>
import * as d3 from "d3";
import portalService from "../services/DataPortalService";
import {BFormInput} from "bootstrap-vue"

export default {
  name: "tree-of-life",
  props: ['node'],
  components:{BFormInput},
  data() {
    return {
        clusterAttr: null,
        link: null,
        linkExtension: null,
        data: null,
        domains: [],
        legendDomains: [],
        stack: [],
    };
  },
  computed: {
    width(){
      return this.$refs.svg.clientWidth
    },
    outerRadius(){
      return this.width/2
    },
    innerRadius(){
      return this.outerRadius - this.outerRadius/3
    },
    windowSize(){
      return this.width <= 450 ? -this.width : -this.outerRadius
    },
    legendPosition(){
      return this.width <= 450 ? -(this.width + this.outerRadius) : -this.outerRadius
    },
    maxNodes:{
      //add wait before triggering request
      get(){
        return this.$store.getters['portal/getMaxNodes']
      },
      set(value){
        this.$store.commit('portal/setMaxNodes',{value:value})
        if(value <= this.data.leaves){
          this.getTree(this.node, value)
        }
      }
    }
  },
  watch: {
    node: function(node){
      this.getTree(node)
    }
  },
  created(){
    this.getTree(this.node)
  },
  methods: {
    getTree(node){
      this.$store.dispatch('portal/showLoading')
      portalService.getTree(node, this.maxNodes)
      .then(response => {
          this.data = response.data
          const firstFork = this.getFirstFork(this.data)
          if (firstFork && firstFork.children.length > 1){
            const leftDomains =this.getDomains(firstFork.children[0], []).slice(0,4)
            const rightDomains = this.getDomains(firstFork.children[1], []).slice(0,4)
            this.legendDomains = [this.data].concat([...leftDomains,...rightDomains])
          }else{
            this.legendDomains = [this.data]
          }
          this.domains = this.legendDomains.map(value => value.name)
          this.$store.commit('portal/setBreadCrumb', {value: {text: node, to: {name: 'tree-of-life', params:{node: node}}}})
          if(this.data){
            this.chart = this.createD3Tree();
            this.$store.dispatch('portal/hideLoading')
          }
          this.$store.dispatch('portal/hideLoading')
      })
      .catch(e => {
        console.log(e)
        this.$store.dispatch('portal/hideLoading')
      })
    },
    createD3Tree(){
      const root = d3.hierarchy(this.data, d => d.children)
      .sum(d => d.children ? 0 : 1)
      .sort((a, b) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length));
      var cluster = this.radialCluster();
      cluster(root);
      this.setRadius(root, root.data.length = 0, this.innerRadius / this.maxLength(root));
      this.setColor(root);
    
      const svg = d3.select(this.$refs.svg)
          .attr("viewBox", [-this.outerRadius, this.windowSize, this.width, this.width])
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
    var div = d3.select(this.$refs.tooltip)
    .style("opacity", 0)

    this.legend(svg);
    this.linkExtension =svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-opacity", 0.25)
      .selectAll("path")
      .data(root.links().filter(d => !d.target.children))
      .join("path")
        .each(function(d) { d.target.linkExtensionNode = this; })
        .attr("d", this.linkExtensionConstant);
  
    this.link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#000")
      .selectAll("path")
      .data(root.links())
      .join("path")
      .each(function(d) { d.target.linkNode = this; })
      .attr("d", this.linkConstant)
      .attr("stroke", d => d.target.color)
      .on("mouseover", function(event, d){
          div.transition()		
            .duration(200)		
            .style("opacity", .9);		
          div.html(d.target.data.name+' :'+d.target.data.leaves)	
            .style("left", (event.layerX) + "px")		
            .style("top", (event.layerY-15) + "px");	
      })
      .on("mouseout", function() {
          div.transition()		
              .duration(500)		
              .style("opacity", 0);	
      })
      .on("click", this.info(this));

    svg.append("g")
      .selectAll("text")
      .data(root.leaves())
      .join("text")
        .attr("dy", ".31em")
        .attr("transform", d => `rotate(${d.x - 90}) translate(${this.innerRadius + 4},0)${d.x < 180 ? "" : " rotate(180)"}`)
        .attr("text-anchor", d => d.x < 180 ? "start" : "end")
        .attr("class","leaves-class")
        .text(d => d.data.name.replace(/_/g, " ")).on("click", this.info(this))
        .on("mouseover", this.mouseovered(true))
        .on("mouseout", this.mouseovered(false));
    this.show = false

    return Object.assign(svg.node());
    },

    update(checked) {
    const t = d3.transition().duration(750);
      this.linkExtension.transition(t).attr("d", checked ? this.linkExtensionVariable : this.linkExtensionConstant);
      this.link.transition(t).attr("d", checked ? this.linkVariable : this.linkConstant);
    },
   info(component) {
     return function(_, d){
       if(d.target && d.target.data){
         component.getData(d.target.data)
       }
       else if(d.data){
        component.getData(d.data)
        }
        else {
          component.getData(d)
        }
     }
    },
    getFirstFork(node) {
      if(node.children.length > 1){
        return node
      }else if(node.children){
        var childNode = null
        node.children.forEach(n => {
          childNode = this.getFirstFork(n)
          })
        return childNode
      }
    },
    getDomains(node,domains) {
      if(node.children){
        node.children.forEach(n => {
          domains = this.getDomains(n,domains)
          })
        if (node.children.length > 1)
          domains.push(node)
      }
      return domains.sort((a,b) => b.leaves-a.leaves)
    },

    getData(taxon){
      const name = taxon.name || taxon
      if(taxon.rank === 'species' || taxon.rank === 'subspecies'){
        this.$router.push({name:'organism-details', params: {name: name}})
      }
      else {
        if(this.node == name){
          return
        }
        this.$router.push({name:'tree-of-life', params: {node: name}})
      }
    
    },
    mouseovered(active) {
      return function(event, d) {
        d3.select(this).classed("label--active", active);
        d3.select(d.linkExtensionNode).classed("link-extension--active", active).raise();
        do {
        d3.select(d.linkNode).classed("link--active", active).raise();
        d = d.parent;
        }
        while (d);
      };
    },
    maxLength(d) {
      return d.data.length + (d.children ? d3.max(d.children, this.maxLength) : 0);
    },
    setRadius(d, y0, k) {
        d.radius = (y0 += d.data.length) * k;
        if (d.children) d.children.forEach(d => this.setRadius(d, y0, k));
    },
    setColor(d) {
        var name = d.data.name;
        d.color = this.color().domain().indexOf(name) >= 0 ? this.color()(name) : d.parent ? d.parent.color : null;
        if (d.children){
           d.children.forEach((item) => {
             this.setColor(item)});
          }
    },
    linkVariable(d) {
      return this.linkStep(d.source.x, d.source.radius, d.target.x, d.target.radius);
    },
    linkConstant(d) {
      return this.linkStep(d.source.x, d.source.y, d.target.x, d.target.y);
    },
    linkExtensionVariable(d) {
      return this.linkStep(d.target.x, d.target.radius, d.target.x, this.innerRadius);
    },
    linkExtensionConstant(d) {
      return this.linkStep(d.target.x, d.target.y, d.target.x, this.innerRadius);
    },
    linkStep(startAngle, startRadius, endAngle, endRadius) {
      const c0 = Math.cos(startAngle = (startAngle - 90) / 180 * Math.PI);
      const s0 = Math.sin(startAngle);
      const c1 = Math.cos(endAngle = (endAngle - 90) / 180 * Math.PI);
      const s1 = Math.sin(endAngle);
      return "M" + startRadius * c0 + "," + startRadius * s0
          + (endAngle === startAngle ? "" : "A" + startRadius + "," + startRadius + " 0 0 " + (endAngle > startAngle ? 1 : 0) + " " + startRadius * c1 + "," + startRadius * s1)
          + "L" + endRadius * c1 + "," + endRadius * s1;
    }, 
    color() {
      const color = d3.scaleOrdinal()
      .domain(this.domains)
      .range(d3.schemeCategory10)
      return color
    },
    radialCluster(){
     return d3.cluster()
    .size([360, this.innerRadius])
    .separation(() => 1)   
    },
    legend(svg){
      const g = svg
        .selectAll("g").text('').attr('fill',null).attr('stroke',null)
        .data(this.color().domain())
        .join("g")
        .attr("transform", (d, i) => `translate(${-this.outerRadius},${this.legendPosition + i * 20})`);
        g.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", this.color());

        g.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", "0.35em")
        .attr("class","legend-text")
        .text(d =>d +' ('+ this.legendDomains.find(value => value.name === d).rank +')')
        .on("click", this.info(this))
        .on("mouseover", this.mouseovered(true))
        .on("mouseout", this.mouseovered(false));
      
    },
  }
};
</script>

<style>
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
  pointer-events: none;			
}
</style>