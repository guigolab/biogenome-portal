<template>
  <div>
    <svg ref="tree" style="width: 1000px"></svg>
  </div>
</template>
<script lang="ts" setup>
  import * as d3 from 'd3'
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router';

  const router = useRouter()
  const tree = ref(null)
  const props = defineProps({
    data: Object
  })
  const nodeSize = 17
  const width = 750
  const domains = ref([])
  const legendDomains = ref([])
  const selectedNode = ref({})
  function color() {
    const color = d3.scaleOrdinal().domain(domains.value).range(d3.schemeCategory10)
    return color
  }
  function setColor(d) {
    var name = d.data.name
    d.color = color().domain().indexOf(name) >= 0 ? color()(name) : d.parent ? d.parent.color : null
    if (d.children) {
      d.children.forEach((item) => {
        setColor(item)
      })
    }
  }
  onMounted(async () => {
    tree.value.focus()
    let i = 0
    const root = d3.hierarchy(props.data, (d) => d.children).eachBefore((d) => (d.index = i++))
    const nodes = root.descendants()
    const sortedDomains = nodes
      .filter((n) => n.children)
      .sort((a, b) => {
        if (a.descendants() === b.descendants()) {
          return a.leaves > b.leaves ? -1 : 1
        } else if (a.leaves === b.leaves) {
          return a.height > b.height ? -1 : 1
        } else {
          return a.descendants().length > b.descendants().length ? -1 : 1
        }
      })
    const slicedDomains = sortedDomains.length > 6 ? sortedDomains.slice(0, 6) : sortedDomains
    legendDomains.value.push(...slicedDomains.map((d) => d.data))

    domains.value = [...legendDomains.value.map((d) => d.name)]
    setColor(root)

    const svg = d3
      .select(tree.value)
      .attr('viewBox', [-nodeSize / 2, (-nodeSize * 3) / 2, width, (nodes.length + 1) * nodeSize])
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .style('overflow', 'visible')

    const link = svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('stroke-width', 2)
      .attr('stroke', (d) => d.target.color)
      .attr(
        'd',
        (d) => `M${d.source.depth * nodeSize},${d.source.index * nodeSize} V${d.target.index * nodeSize} h${nodeSize}`,
      )

    // svg.append('g').call(legend)

    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', (d) => `translate(0,${d.index * nodeSize})`)

    node
      .append('circle')
      .attr('cx', (d) => d.depth * nodeSize)
      .attr('r', 2.5)
      .attr('fill', (d) => (d.children ? null : '#999'))

    node
      .append('text')
      .attr('dy', '0.32em')
      .attr('x', (d) => d.depth * nodeSize + 6)
      .text((d) => `${d.data.name} (${d.data.rank})`)
      .on('click', (event, d) => {
        const path = d.data.leaves === 0? 
        {name:'organism', params:{taxid:d.data.taxid}}:{name:'taxon', params:{taxid:d.data.taxid}}
        router.push(path)
        //     console.log(d)
        //     domains.value = d.data.children.map(d => d.name)
        //     setColor(root)
        // const link = svg.append("g")
        //     .attr("fill", "none")
        //     .attr('stroke', '#000')
        //     .selectAll("path")
        //     .data(root.links())
        //     .join("path")
        //         .attr('stroke', (d) => d.target.color)
        //         .attr("d", d => `M${d.source.depth * nodeSize},${d.source.index * nodeSize} V${d.target.index * nodeSize} h${nodeSize}`);
      })

    node.append('title').text((d) =>
      d
        .ancestors()
        .reverse()
        .map((d) => d.data.name)
        .join('/'),
    )
    // svg.append("text")
    //   .attr("dy", "0.32em")
    //   .attr("y", -nodeSize)
    //   .attr("x", 0)
    //   .attr("text-anchor", "end")
    //   .attr("font-weight", "bold")
    //   .text("Organisms");

    // node.append("text")
    //     .attr("dy", "0.32em")
    //     .attr("x", )
    //     .attr("text-anchor", "end")
    //     .attr("fill", d => d.children ? null : "#555")
    //         .data(root.descendants())
    //         .text(d => d.data.leaves? d.data.leaves : '-');
  })
  // function legend(svg) {
  //   const g = svg
  //     .selectAll('g')
  //     .text('')
  //     .attr('fill', null)
  //     .attr('stroke', null)
  //     .data(color().domain())
  //     .join('g')
  //     .attr('transform', (d, i) => `translate(0,${ i * 20})`)
  //   g.append('rect').attr('width', 15).attr('height', 15).attr('fill', color())
  //   g.append('text')
  //     .attr('x', 24)
  //     .attr('y', 9)
  //     .attr('dy', '0.35em')
  //     .attr('class', 'legend-text')
  //     .text((d) => d + ' (' + legendDomains.value.find((value) => value.name === d).rank + ')')
  //     .on('click', function (event, d) {
  //       const selectedDomain = legendDomains.value.find((value) => value.name === d)
  //       selectedNode.value = { ...selectedDomain }
  //       selectedNode.value.color = color()(d)
  //       div.style('left', event.layerX + 'px').style('top', event.layerY - 15 + 'px')
  //       showDetails.value = true
  //     })
  // }
</script>
