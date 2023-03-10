<template>
  <va-card class="custom-card">
    <va-card-title>
      <div class="row justify-space-between align-center">
        <div class="flex">
          <va-badge transparent :text="taxonomyStore.breadcrumbs.length">
            <va-button preset="secondary" icon="history" size="small" @click="showModal = true">History</va-button>
          </va-badge>
        </div>
        <div class="flex">
          <va-button-dropdown
            size="small"
            split
            :label="`Download ${downloadType}`"
            @main-button-click="downloadType === 'svg' ? downloadSVGImage() : downloadPGNImage()"
          >
            <ul>
              <li>
                <va-button preset="plain" @click="downloadType = 'svg'"> SVG </va-button>
              </li>
              <li>
                <va-button preset="plain" @click="downloadType = 'png'"> PNG </va-button>
              </li>
            </ul>
          </va-button-dropdown>
        </div>
      </div>
    </va-card-title>
    <va-card-content v-if="taxName">
      <h2 style="text-align: center" class="va-h6">{{ taxName }}</h2>
    </va-card-content>
    <va-card-content>
      <div ref="tooltip" class="tooltip">
        <va-card v-if="showDetails" stripe :stripe-color="selectedNode.color" class="box">
          <va-card-content style="text-align: start">
            <va-list>
              <va-list-item>
                <va-list-item-section>
                  <va-list-item-label>
                    {{ `${selectedNode.name} (${selectedNode.rank})` }}
                  </va-list-item-label>

                  <va-list-item-label caption>
                    <p class="va-title">taxid: {{ selectedNode.taxid }}</p>
                    <p v-if="selectedNode.leaves" class="va-title">organisms: {{ selectedNode.leaves }}</p>
                  </va-list-item-label>
                </va-list-item-section>
                <va-list-item-section icon>
                  <va-icon color="danger" name="close" @click="showDetails = false" />
                </va-list-item-section>
              </va-list-item>
            </va-list>
          </va-card-content>
          <va-card-actions align="between">
            <va-button size="small" @click="$emit('toOrganismList', selectedNode.taxid)">see organisms</va-button>
            <va-button v-if="selectedNode.leaves" size="small" @click="updateTree(selectedNode)"
              >generate tree</va-button
            >
          </va-card-actions>
        </va-card>
      </div>
      <svg ref="tree" class="tree-svg"></svg>
    </va-card-content>
  </va-card>
  <va-modal v-model="showModal" size="large">
    <div style="width: 300px">
      <va-timeline vertical>
        <va-timeline-item
          v-for="(bc, index) in taxonomyStore.breadcrumbs"
          :key="index"
          :active="bc.name === taxName ? true : undefined"
        >
          <template #before>
            <div class="row title title--danger va-timeline-item__text">
              <div class="flex">
                <span class=""> {{ bc.name }} ({{ bc.rank }}) </span>
              </div>
            </div>
          </template>
          <template #after>
            <va-chip class="mb-0" @click="goBack(bc)"> Go </va-chip>
            <!-- <va-card stripe class="mb-0">
                    <va-card-content>
                      <p></p>{{ bc.taxid }}</va-card-content>
                  </va-card> -->
          </template>
        </va-timeline-item>
      </va-timeline>
    </div>
  </va-modal>
</template>
<script setup lang="ts">
  import { reactive, onMounted, ref, computed } from 'vue'
  import * as d3 from 'd3'
  import { useRouter } from 'vue-router'
  import { Canvg } from 'canvg'
  import { useTaxonomyStore } from '../stores/taxonomy-store'

  const taxonomyStore = useTaxonomyStore()

  const emits = defineEmits(['updateTree', 'toOrganismList'])
  const router = useRouter()
  var linkExtension = null
  var link = null
  var legendDomains = reactive([])
  const props = defineProps({
    // node:String,
    data: Object,
  })
  const showModal = ref(false)
  const taxName = ref(props.data.name)
  const width = ref(954)
  const tooltip = ref(null)
  const showDetails = ref(false)
  const outerRadius = computed(() => width.value / 2)
  const innerRadius = computed(() => outerRadius.value - 170)
  const downloadType = ref('svg')
  var domains = reactive([])
  const tree = ref(null)
  const selectedNode = ref({})
  onMounted(() => {
    tree.value.focus()
    tooltip.value.focus()
    createD3Tree(props.data)
  })

  function goBack(bc) {
    const index = taxonomyStore.breadcrumbs.findIndex((b) => b.taxid === bc.taxid)
    if (index !== -1) {
      taxonomyStore.breadcrumbs = taxonomyStore.breadcrumbs.slice(0, index + 1)
      emits('updateTree', bc.taxid)
    }
  }
  function updateTree(node) {
    const index = taxonomyStore.breadcrumbs.findIndex((b) => b.taxid === node.taxid)
    if (index === -1) {
      taxonomyStore.breadcrumbs.push(node)
    } else {
      taxonomyStore.breadcrumbs = taxonomyStore.breadcrumbs.slice(0, index + 1)
    }
    emits('updateTree', node.taxid)
  }
  function downloadSVGImage() {
    const svg = tree.value.cloneNode(true) // clone your original svg
    const g = svg.querySelector('g') // select the parent g
    g.setAttribute('transform', '') // clean transform
    svg.setAttribute('background-color', 'white')
    g.setAttribute('background-color', 'white')
    const svgAsXML = new XMLSerializer().serializeToString(svg)
    const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`
    const link = document.createElement('a')
    link.setAttribute('href', svgData)
    link.setAttribute('download', 'image.svg')
    link.click()
  }

  function downloadPGNImage() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const svgAsXML = new XMLSerializer().serializeToString(tree.value)
    ctx.canvas.width = 2000
    ctx.canvas.height = 2000
    const v = Canvg.fromString(ctx, svgAsXML)
    v.start()
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    const link = document.createElement('a')
    link.setAttribute('href', canvas.toDataURL('image/png'))
    link.setAttribute('download', 'image.png')
    link.click()
  }

  function createD3Tree(data) {
    const root = d3.hierarchy(data, (d) => d.children)
    root
      .sum((d) => (d.children ? 0 : 1))
      .sort((a, b) => a.value - b.value || d3.ascending(a.data.length, b.data.length))

    const sortedDomains = root
      .descendants()
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

    // .sort((a, b) => b.children.length+b.height - a.children.length+a.height)
    const slicedDomains = sortedDomains.length > 6 ? sortedDomains.slice(0, 6) : sortedDomains
    legendDomains.push(...slicedDomains.map((d) => d.data))

    domains = [...legendDomains.map((d) => d.name)]
    var cluster = radialCluster()
    cluster(root)
    setRadius(root, (root.data.length = 0), innerRadius.value / maxLength(root))
    setColor(root)
    const svg = d3
      .select(tree.value)
      .attr('viewBox', [-outerRadius.value, -outerRadius.value, width.value, width.value])
      .attr('font-family', 'inherit')
    // .attr('font-size', 12)

    svg.append('style').text(`
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
        `)

    const div = d3.select(tooltip.value)
    // .style("opacity", 0)

    svg.append('g').call(legend)

    linkExtension = svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-opacity', 0.25)
      .selectAll('path')
      .data(root.links().filter((d) => !d.target.children))
      .join('path')
      .each(function (d) {
        d.target.linkExtensionNode = this
      })
      .attr('d', linkExtensionConstant)

    link = svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .selectAll('path')
      .data(root.links())
      .join('path')
      .each(function (d) {
        d.target.linkNode = this
      })
      .attr('d', linkConstant)
      .attr('stroke', (d) => d.target.color)
      .on('click', function (event, d) {
        selectedNode.value = d.target.data
        selectedNode.value.color = d.target.color
        div.style('left', event.layerX + 'px').style('top', event.layerY - 15 + 'px')
        showDetails.value = true
      })

    svg
      .append('g')
      .selectAll('text')
      .data(root.leaves())
      .join('text')
      .attr('dy', '.31em')
      .attr(
        'transform',
        (d) => `rotate(${d.x - 90}) translate(${innerRadius.value + 4},0)${d.x < 180 ? '' : ' rotate(180)'}`,
      )
      .attr('text-anchor', (d) => (d.x < 180 ? 'start' : 'end'))
      .attr('class', 'leaves-class')
      .text((d) => d.data.name.replace(/_/g, ' '))
      .on('mouseover', mouseovered(true))
      .on('mouseout', mouseovered(false))
      .on('click', function (event, d) {
        selectedNode.value = d.data
        selectedNode.value.color = d.color
        div.style('left', event.layerX + 'px').style('top', event.layerY - 15 + 'px')
        showDetails.value = true
      })
  }

  function maxLength(d) {
    return d.data.length + (d.children ? d3.max(d.children, maxLength) : 0)
  }

  function mouseovered(active) {
    return function (event, d) {
      d3.select(this).classed('label--active', active)
      d3.select(d.linkExtensionNode).classed('link-extension--active', active).raise()
      do {
        d3.select(d.linkNode).classed('link--active', active).raise()
        d = d.parent
      } while (d)
    }
  }
  function setRadius(d, y0, k) {
    d.radius = (y0 += d.data.length) * k
    if (d.children) d.children.forEach((d) => setRadius(d, y0, k))
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

  function linkConstant(d) {
    return linkStep(d.source.x, d.source.y, d.target.x, d.target.y)
  }

  function linkExtensionConstant(d) {
    return linkStep(d.target.x, d.target.y, d.target.x, innerRadius.value)
  }

  function linkStep(startAngle, startRadius, endAngle, endRadius) {
    const c0 = Math.cos((startAngle = ((startAngle - 90) / 180) * Math.PI))
    const s0 = Math.sin(startAngle)
    const c1 = Math.cos((endAngle = ((endAngle - 90) / 180) * Math.PI))
    const s1 = Math.sin(endAngle)
    return (
      'M' +
      startRadius * c0 +
      ',' +
      startRadius * s0 +
      (endAngle === startAngle
        ? ''
        : 'A' +
          startRadius +
          ',' +
          startRadius +
          ' 0 0 ' +
          (endAngle > startAngle ? 1 : 0) +
          ' ' +
          startRadius * c1 +
          ',' +
          startRadius * s1) +
      'L' +
      endRadius * c1 +
      ',' +
      endRadius * s1
    )
  }

  function color() {
    const color = d3.scaleOrdinal().domain(domains).range(d3.schemeCategory10)
    return color
  }

  function radialCluster() {
    return d3
      .cluster()
      .size([360, innerRadius.value])
      .separation(() => 1)
  }

  function legend(svg) {
    const div = d3.select(tooltip.value)
    const g = svg
      .selectAll('g')
      .text('')
      .attr('fill', null)
      .attr('stroke', null)
      .data(color().domain())
      .join('g')
      .attr('transform', (d, i) => `translate(${-outerRadius.value},${-outerRadius.value + i * 20})`)
    g.append('rect').attr('width', 15).attr('height', 15).attr('fill', color())
    g.append('text')
      .attr('x', 24)
      .attr('y', 9)
      .attr('dy', '0.35em')
      .attr('class', 'legend-text')
      .text((d) => d + ' (' + legendDomains.find((value) => value.name === d).rank + ')')
      .on('click', function (event, d) {
        const selectedDomain = legendDomains.find((value) => value.name === d)
        selectedNode.value = { ...selectedDomain }
        selectedNode.value.color = color()(d)
        div.style('left', event.layerX + 'px').style('top', event.layerY - 15 + 'px')
        showDetails.value = true
      })
      .on('mouseover', mouseovered(true))
      .on('mouseout', mouseovered(false))
  }

  function toPageDetails(route) {
    router.push(route)
  }
</script>

<style scoped>
  .leaves-class,
  .legend-text {
    cursor: pointer;
    /* font-size: 0.8rem; */
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
