import * as d3 from 'd3'
const width = 954
const outerRadius = width/2
const innerRadius = outerRadius - 170

function radialCluster() {
    return d3
      .cluster()
      .size([360, innerRadius])
      .separation(() => 1)
  }

function setRadius(d, y0, k) {
    d.radius = (y0 += d.data.length) * k
    if (d.children) d.children.forEach((d) => setRadius(d, y0, k))
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
  function maxLength(d) {
    return d.data.length + (d.children ? d3.max(d.children, maxLength) : 0)
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
export function createRadialTree(ref, root, domains){

    const width = 954
    const outerRadius = width/2
    const innerRadius = outerRadius - 170
    const cluster = radialCluster()

    cluster(root)
    setRadius(root, (root.data.length = 0), innerRadius / maxLength(root))

    const svg = d3
    .select(ref.value)
    .attr('viewBox', [-outerRadius, -outerRadius, width, width])
    .attr('font-family', 'inherit')

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

    const g = svg.append('g')
        .selectAll('g')
        .text('')
        .attr('fill', null)
        .attr('stroke', null)
        .data(domains)
        .join('g')
        .attr('transform', (d, i) => `translate(${-outerRadius},${-outerRadius + i * 20})`)
      g.append('rect').attr('width', 15).attr('height', 15).attr('fill', d => d.color)
      g.append('text')
        .attr('x', 24)
        .attr('y', 9)
        .attr('dy', '0.35em')
        .attr('class', 'legend-text')
        .text((d) =>{
          return d.data.name + ' (' + d.data.rank + ')'
        } )
      //   .on('click', function (event, d) {
      //     const selectedDomain = legendDomains.value.find((value) => value.name === d)
      //     selectedNode.value = { ...selectedDomain }
      //     selectedNode.value.color = color()(d)
      //     div.style('left', event.layerX + 'px').style('top', event.layerY - 15 + 'px')
      //     showDetails.value = true
      //   })
        .on('mouseover', mouseovered(true))
        .on('mouseout', mouseovered(false))

    svg
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

      svg
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
      // .on('click', function (event, d) {
      //   selectedNode.value = d.target.data
      //   selectedNode.value.color = d.target.color
      //   div.style('left', event.layerX + 'px').style('top', event.layerY - 15 + 'px')
      //   showDetails.value = true
      // })
      svg
      .append('g')
      .selectAll('text')
      .data(root.leaves())
      .join('text')
      .attr('dy', '.31em')
      .attr(
        'transform',
        (d) => `rotate(${d.x - 90}) translate(${innerRadius + 4},0)${d.x < 180 ? '' : ' rotate(180)'}`,
      )
      .attr('text-anchor', (d) => (d.x < 180 ? 'start' : 'end'))
      .attr('class', 'leaves-class')
      .text((d) => d.data.name.replace(/_/g, ' '))
      .on('mouseover', mouseovered(true))
      .on('mouseout', mouseovered(false))
    //   .on('click', function (event, d) {
    //     selectedNode.value = d.data
    //     selectedNode.value.color = d.color
    //     div.style('left', event.layerX + 'px').style('top', event.layerY - 15 + 'px')
    //     showDetails.value = true
    //   })
}