<template>
  <div>
    <svg ref="tree" style="width: 1000px"></svg>
  </div>
</template>
<script lang="ts" setup>
  import * as d3 from 'd3'
  import { onMounted, ref } from 'vue'
  import TaxonService from '../../services/clients/TaxonService'

  const tree = ref(null)
  const rootNode = '2759'
  const nodeSize = 17
  const width = 750
  const domains = ref([])

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
    const { data } = await TaxonService.getTree(rootNode)
    let i = 0
    const root = d3.hierarchy(data, (d) => d.children).eachBefore((d) => (d.index = i++))
    const nodes = root.descendants()
    domains.value = root.children?.map((d) => d.data.name)
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
</script>
