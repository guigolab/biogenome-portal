'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { type TaxonNode } from '@/lib/mock-data'

interface RadialTreeProps {
  data: TaxonNode
  onSelectNode: (node: TaxonNode) => void
  selectedNode: TaxonNode | null
}

export function RadialTree({ data, onSelectNode, selectedNode }: RadialTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 800 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ 
          width: Math.max(width, 400), 
          height: Math.max(height, 400) 
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (!svgRef.current || !data) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = dimensions
    const radius = Math.min(width, height) / 2 - 80

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    // Create hierarchy
    const root = d3.hierarchy(data)
    
    // Create radial tree layout
    const tree = d3.tree<TaxonNode>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)

    tree(root)

    // Create radial link generator
    const linkGenerator = d3.linkRadial<d3.HierarchyPointLink<TaxonNode>, d3.HierarchyPointNode<TaxonNode>>()
      .angle(d => d.x)
      .radius(d => d.y)

    // Draw links
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .attr('d', linkGenerator as d3.Link<unknown, d3.HierarchyPointLink<TaxonNode>, d3.HierarchyPointNode<TaxonNode>>)

    // Create node groups
    const nodes = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `
        rotate(${(d.x * 180 / Math.PI) - 90})
        translate(${d.y}, 0)
      `)
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        onSelectNode(d.data)
      })

    // Draw node circles
    nodes.append('circle')
      .attr('r', d => {
        if (d.depth === 0) return 12
        if (d.depth === 1) return 10
        if (d.depth === 2) return 8
        return 6
      })
      .attr('fill', d => {
        if (selectedNode && d.data.id === selectedNode.id) {
          return 'hsl(var(--primary))'
        }
        if (d.depth === 0) return 'hsl(var(--primary))'
        if (d.depth === 1) return 'hsl(var(--chart-1))'
        if (d.depth === 2) return 'hsl(var(--chart-2))'
        if (d.depth === 3) return 'hsl(var(--chart-3))'
        return 'hsl(var(--chart-4))'
      })
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 2)
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', d => {
            const data = d as d3.HierarchyPointNode<TaxonNode>
            if (data.depth === 0) return 14
            if (data.depth === 1) return 12
            if (data.depth === 2) return 10
            return 8
          })
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', d => {
            const data = d as d3.HierarchyPointNode<TaxonNode>
            if (data.depth === 0) return 12
            if (data.depth === 1) return 10
            if (data.depth === 2) return 8
            return 6
          })
      })

    // Add labels
    nodes.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => (d.x < Math.PI) === !d.children ? 10 : -10)
      .attr('text-anchor', d => (d.x < Math.PI) === !d.children ? 'start' : 'end')
      .attr('transform', d => (d.x >= Math.PI ? 'rotate(180)' : null))
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-size', d => {
        if (d.depth === 0) return '14px'
        if (d.depth === 1) return '12px'
        return '10px'
      })
      .attr('font-weight', d => d.depth <= 1 ? '600' : '400')
      .text(d => d.data.name)
      .attr('paint-order', 'stroke')
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 3)

  }, [data, dimensions, onSelectNode, selectedNode])

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px]">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
