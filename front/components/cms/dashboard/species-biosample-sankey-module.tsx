// @ts-nocheck — d3 / d3-sankey lack complete typings in this project
'use client'

import * as d3 from 'd3'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'
import Link from 'next/link'
import { GitBranch, Loader2, Plus, Table2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import { buildSpeciesBiosampleGraph } from '@/lib/cms/species-biosample-graph'
import type { DashboardModuleVariant } from '@/components/cms/dashboard/dashboard-module-variant'
import { cmsGetSubmittedBioSamples, cmsGetUserSpecies } from '@/lib/cms/services/auth'
import { cn } from '@/lib/utils'
import { useCmsAuthStore } from '@/stores/cms-auth-store'

function truncate(str: string, len: number) {
   return str.length > len ? `${str.slice(0, len - 1)}…` : str
}

export function SpeciesBiosampleSankeyModule({
   hasEnaTemplate,
   variant = 'standalone',
}: {
   hasEnaTemplate: boolean
   variant?: DashboardModuleVariant
}) {
   const userName = useCmsAuthStore((s) => s.userName)
   const [organisms, setOrganisms] = useState<Record<string, unknown>[]>([])
   const [biosamples, setBiosamples] = useState<Record<string, unknown>[]>([])
   const [loading, setLoading] = useState(true)

   const svgRef = useRef<SVGSVGElement | null>(null)
   const scrollRef = useRef<HTMLDivElement | null>(null)

   const graph = useMemo(() => buildSpeciesBiosampleGraph(organisms, biosamples), [organisms, biosamples])

   const fetchData = useCallback(async () => {
      if (!userName) {
         setOrganisms([])
         setBiosamples([])
         setLoading(false)
         return
      }
      setLoading(true)
      try {
         const [orgRes, bsRes] = await Promise.all([
            cmsGetUserSpecies(userName, { limit: 200 }),
            cmsGetSubmittedBioSamples({ user: userName, limit: 500 }),
         ])
         setOrganisms(orgRes.data ?? [])
         setBiosamples(bsRes.data ?? [])
      } catch {
         setOrganisms([])
         setBiosamples([])
      } finally {
         setLoading(false)
      }
   }, [userName])

   useEffect(() => {
      void fetchData()
   }, [fetchData])

   const renderSankey = useCallback(() => {
      const el = svgRef.current
      if (!el || graph.links.length === 0) {
         if (el) d3.select(el).selectAll('*').remove()
         return
      }

      d3.select(el).selectAll('*').remove()

      const scrollEl = scrollRef.current
      const containerWidth = scrollEl?.clientWidth ?? el.parentElement?.clientWidth ?? 680
      const nodeCount = Math.max(
         graph.nodes.filter((n) => n.type === 'organism').length,
         graph.nodes.filter((n) => n.type === 'biosample').length,
      )
      const height = Math.max(200, nodeCount * 36 + 60)
      const margin = { top: 16, right: 160, bottom: 16, left: 200 }
      const width = containerWidth
      const innerW = width - margin.left - margin.right
      const innerH = height - margin.top - margin.bottom

      el.setAttribute('width', String(width))
      el.setAttribute('height', String(height))

      const rootStyle = getComputedStyle(document.documentElement)
      const orgColor = rootStyle.getPropertyValue('--chart-1').trim() || 'oklch(0.5 0.15 250)'
      const bsColor = rootStyle.getPropertyValue('--chart-2').trim() || 'oklch(0.55 0.12 170)'
      const fg = rootStyle.getPropertyValue('--foreground').trim() || 'oklch(0.2 0 0)'

      const svg = d3
         .select(el)
         .append('g')
         .attr('transform', `translate(${margin.left},${margin.top})`)

      const nodeIndex = new Map<string, number>()
      const sankeyNodes = graph.nodes.map((n, i) => {
         nodeIndex.set(n.id, i)
         return { name: n.label, type: n.type, originalId: n.id }
      })
      const sankeyLinks = graph.links.map((l) => ({
         source: nodeIndex.get(l.source)!,
         target: nodeIndex.get(l.target)!,
         value: l.value,
         meta: l,
      }))

      const sankeyLayout = d3Sankey()
         .nodeWidth(12)
         .nodePadding(10)
         .extent([
            [0, 0],
            [innerW, innerH],
         ])

      const { nodes, links } = sankeyLayout({
         nodes: sankeyNodes.map((d) => ({ ...d })),
         links: sankeyLinks.map((d) => ({ ...d })),
      }) as {
         nodes: SankeyLaidOutNode[]
         links: SankeyLaidOutLink[]
      }

      svg.append('g')
         .attr('fill', 'none')
         .selectAll('path')
         .data(links)
         .join('path')
         .attr('d', sankeyLinkHorizontal())
         .attr('stroke', (d) => (nodeType(d.source) === 'organism' ? orgColor : bsColor))
         .attr('stroke-width', (d) => Math.max(1.5, d.width ?? 1))
         .attr('stroke-opacity', 0.35)
         .attr('class', 'cursor-default hover:stroke-opacity-65')

      svg.append('g')
         .selectAll('rect')
         .data(nodes)
         .join('rect')
         .attr('x', (d) => d.x0)
         .attr('y', (d) => d.y0)
         .attr('height', (d) => Math.max(2, d.y1 - d.y0))
         .attr('width', (d) => Math.max(2, d.x1 - d.x0))
         .attr('fill', (d) => (d.type === 'organism' ? orgColor : bsColor))
         .attr('rx', 3)

      const labelRotateDeg = -26
      svg.append('g')
         .selectAll('text.label-left')
         .data(nodes.filter((d) => d.type === 'organism'))
         .join('text')
         .attr('class', 'label-left')
         .attr('x', (d) => d.x0 - 8)
         .attr('y', (d) => (d.y0 + d.y1) / 2)
         .attr('dy', '0.35em')
         .attr('text-anchor', 'end')
         .attr('font-size', '11px')
         .attr('fill', fg)
         .attr('font-style', 'italic')
         .attr('transform', (d) => {
            const cx = d.x0 - 8
            const cy = (d.y0 + d.y1) / 2
            return `rotate(${labelRotateDeg} ${cx} ${cy})`
         })
         .text((d) => truncate(String(d.name), 42))

      svg.append('g')
         .selectAll('text.label-right')
         .data(nodes.filter((d) => d.type === 'biosample'))
         .join('text')
         .attr('class', 'label-right')
         .attr('x', (d) => d.x1 + 8)
         .attr('y', (d) => (d.y0 + d.y1) / 2)
         .attr('dy', '0.35em')
         .attr('text-anchor', 'start')
         .attr('font-size', '11px')
         .attr('fill', fg)
         .text((d) => truncate(String(d.name), 28))
   }, [graph.links, graph.nodes])

   function nodeType(n: SankeyLaidOutNode | number): string | undefined {
      if (typeof n === 'number') return undefined
      return n.type
   }

   useEffect(() => {
      void renderSankey()
   }, [renderSankey])

   useEffect(() => {
      const el = scrollRef.current
      if (!el || typeof ResizeObserver === 'undefined') return
      const ro = new ResizeObserver(() => renderSankey())
      ro.observe(el)
      return () => ro.disconnect()
   }, [renderSankey])

   const embedded = variant === 'tabPanel'

   return (
      <Card
         className={cn(
            'flex min-h-0 flex-1 flex-col border-border/80 shadow-sm',
            embedded && 'min-h-[480px] rounded-xl border bg-card lg:min-h-[560px]',
         )}
      >
         <CardHeader className={cn(embedded && 'pb-2')}>
            {embedded ? (
               <p className="text-sm text-muted-foreground">
                  Relationship between your assigned species and EBI biosamples you have submitted.
               </p>
            ) : (
               <>
                  <CardTitle className="flex items-center gap-2">
                     <GitBranch className="h-5 w-5 text-muted-foreground" />
                     Species ↔ submitted biosamples
                  </CardTitle>
                  <CardDescription>Assigned species linked to EBI biosamples you submitted.</CardDescription>
               </>
            )}
         </CardHeader>
         <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            {loading ? (
               <div className="flex flex-1 items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
               </div>
            ) : graph.links.length === 0 ? (
               <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                  <GitBranch className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No relationships yet.</p>
                  {hasEnaTemplate ? (
                     <Button size="sm" asChild>
                        <Link href="/admin/publish-biosample" className="gap-2">
                           <Plus className="h-4 w-4" />
                           Submit biosample
                        </Link>
                     </Button>
                  ) : null}
               </div>
            ) : (
               <>
                  <div ref={scrollRef} className="min-h-[200px] flex-1 overflow-auto rounded-md border border-border/80">
                     <div className="p-3">
                        <svg ref={svgRef} className="block max-w-full" aria-hidden />
                     </div>
                  </div>
                  <details className="group border-t border-border pt-2">
                     <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
                        <Table2 className="h-4 w-4" />
                        View as table
                     </summary>
                     <Table className="mt-3">
                        <TableHeader>
                           <TableRow>
                              <TableHead>Species</TableHead>
                              <TableHead>Biosample</TableHead>
                              <TableHead>Accession</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {graph.links.map((link, i) => (
                              <TableRow key={i}>
                                 <TableCell className="italic">{link.scientificName}</TableCell>
                                 <TableCell className="font-mono text-sm">{link.biosampleName}</TableCell>
                                 <TableCell>
                                    {link.biosampleAccession ? (
                                       <a
                                          href={`https://www.ebi.ac.uk/biosamples/samples/${link.biosampleAccession}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-primary underline-offset-4 hover:underline"
                                       >
                                          {link.biosampleAccession}
                                       </a>
                                    ) : (
                                       '—'
                                    )}
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </details>
               </>
            )}
         </CardContent>
      </Card>
   )
}

type SankeyLaidOutNode = {
   name?: string
   type?: string
   x0: number
   x1: number
   y0: number
   y1: number
}

type SankeyLaidOutLink = {
   source: SankeyLaidOutNode | number
   target: SankeyLaidOutNode | number
   width?: number
}
