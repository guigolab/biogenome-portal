'use client'

import { Fragment, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { iucnRedListBadge } from '@/lib/iucnCategory'
import { sanitizeIucnHtmlFragment } from '@/lib/sanitizeIucnHtml'
import { cn } from '@/lib/utils'
import { ExternalLink, Shield } from 'lucide-react'

function str(v: unknown): string {
   if (v == null) return ''
   const s = String(v).trim()
   return s
}

function lineFromApiDict(d: Record<string, unknown>): string | null {
   for (const k of ['name', 'title', 'label', 'habitat', 'threat', 'description']) {
      const v = d[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
      if (v && typeof v === 'object' && !Array.isArray(v)) {
         const nested = lineFromApiDict(v as Record<string, unknown>)
         if (nested) return nested
      }
   }
   return null
}

function escHtml(s: string): string {
   return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** IUCN v4 habitat/threat row: ``description`` may be ``{ en: "<html>" }`` or a string. */
function habitatOrThreatRowToHtml(row: Record<string, unknown>): string {
   const parts: string[] = []
   const desc = row.description
   if (typeof desc === 'string' && desc.trim()) {
      parts.push(`<div>${desc.trim()}</div>`)
   } else if (desc && typeof desc === 'object') {
      const en = (desc as Record<string, unknown>).en
      if (typeof en === 'string' && en.trim()) {
         parts.push(`<div>${en.trim()}</div>`)
      }
   }

   const metaKeys = [
      'code',
      'season',
      'suitability',
      'majorImportance',
      'scope',
      'score',
      'severity',
      'timing',
      'ias',
      'virus',
      'internationalTrade',
   ] as const
   const bits: string[] = []
   for (const k of metaKeys) {
      const v = row[k]
      if (v == null || v === '') continue
      if (typeof v === 'object') continue
      bits.push(`<span class="whitespace-nowrap">${escHtml(k)}: ${escHtml(String(v))}</span>`)
   }
   if (bits.length > 0) {
      parts.push(`<p class="text-xs opacity-80 mt-2">${bits.join(' · ')}</p>`)
   }

   if (parts.length === 0) {
      const fallback = lineFromApiDict(row)
      if (fallback) parts.push(`<div>${fallback}</div>`)
   }
   return parts.join('')
}

function formatFetchedAt(raw: unknown): string | null {
   if (raw == null) return null
   if (typeof raw === 'string') return raw.slice(0, 10)
   if (typeof raw === 'object' && raw !== null && '$date' in raw) {
      const d = (raw as { $date?: string }).$date
      if (typeof d === 'string') return d.slice(0, 10)
   }
   return null
}

function formatNarrativeLabel(key: string): string {
   return key.replace(/^supplementary_/, '').replace(/_/g, ' ')
}

const TAB_PANEL_CLASS =
   'h-[min(28rem,58vh)] overflow-y-auto rounded-md border border-border bg-muted/20 p-3'

const htmlBoxClass =
   'max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5'

function HtmlChunk({ html }: { html: string }) {
   const safe = sanitizeIucnHtmlFragment(html)
   return (
      <div
         className={htmlBoxClass}
         // eslint-disable-next-line react/no-danger -- IUCN API returns HTML narratives; sanitized minimally
         dangerouslySetInnerHTML={{ __html: safe }}
      />
   )
}

/** Fields other than ``habitats``, ``threats``, ``narratives`` (see OrganismRedList embedded doc). */
function IucnRestAttributes({ o, categoryShownInBadge }: { o: Record<string, unknown>; categoryShownInBadge: boolean }) {
   const rows: { key: string; value: string }[] = []
   if (!categoryShownInBadge && str(o.category)) rows.push({ key: 'Category', value: str(o.category) })
   if (str(o.population_trend)) rows.push({ key: 'Population trend', value: str(o.population_trend) })
   if (str(o.assessment_date)) rows.push({ key: 'Assessment date', value: str(o.assessment_date) })
   if (str(o.published_year)) rows.push({ key: 'Year published', value: str(o.published_year) })
   const synced = formatFetchedAt(o.fetched_at)
   if (synced) rows.push({ key: 'Data synced', value: synced })
   if (str(o.source_api_version)) rows.push({ key: 'API version', value: str(o.source_api_version) })

   if (rows.length === 0) return null
   return (
      <div className="rounded-md border border-border bg-muted/20 p-3 mb-4">
         <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            {rows.map(({ key, value }) => (
               <Fragment key={key}>
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd
                     className={cn(
                        'font-medium',
                        key === 'Data synced' && 'text-muted-foreground',
                     )}
                  >
                     {value}
                  </dd>
               </Fragment>
            ))}
         </dl>
      </div>
   )
}

type SpeciesIucnSectionProps = {
   organism: Record<string, unknown>
   scientificName: string
   className?: string
}

export function SpeciesIucnSection({ organism, scientificName, className }: SpeciesIucnSectionProps) {
   const rl = organism.iucn_redlist
   const badge = iucnRedListBadge(organism)
   const searchHref = `https://www.iucnredlist.org/search?query=${encodeURIComponent(scientificName)}`

   const { habitatHtmlBlocks, threatHtmlBlocks, narrativeEntries } = useMemo(() => {
      if (!rl || typeof rl !== 'object') {
         return { habitatHtmlBlocks: [] as string[], threatHtmlBlocks: [] as string[], narrativeEntries: [] as [string, string][] }
      }
      const o = rl as Record<string, unknown>
      if (o.not_found === true) {
         return { habitatHtmlBlocks: [], threatHtmlBlocks: [], narrativeEntries: [] }
      }

      const habitatHtmlBlocks: string[] = []
      const habitats = Array.isArray(o.habitats) ? o.habitats : []
      for (const h of habitats) {
         if (h && typeof h === 'object') {
            const html = habitatOrThreatRowToHtml(h as Record<string, unknown>)
            if (html.trim()) habitatHtmlBlocks.push(html)
         }
      }

      const threatHtmlBlocks: string[] = []
      const threats = Array.isArray(o.threats) ? o.threats : []
      for (const t of threats) {
         if (t && typeof t === 'object') {
            const html = habitatOrThreatRowToHtml(t as Record<string, unknown>)
            if (html.trim()) threatHtmlBlocks.push(html)
         }
      }

      const narratives =
         o.narratives && typeof o.narratives === 'object' ? (o.narratives as Record<string, unknown>) : {}
      const narrativeEntries = Object.entries(narratives).filter(
         ([, v]) => typeof v === 'string' && v.trim().length > 0,
      ) as [string, string][]

      return { habitatHtmlBlocks, threatHtmlBlocks, narrativeEntries }
   }, [rl])

   if (!rl || typeof rl !== 'object') {
      return (
         <Card className={className}>
            <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  IUCN Red List
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
               <p className="text-sm text-muted-foreground">
                  No Red List assessment is stored for this taxon yet. Open the Red List to look up the species
                  manually.
               </p>
               <Button variant="outline" size="sm" asChild>
                  <a href={searchHref} target="_blank" rel="noopener noreferrer">
                     Search IUCN Red List
                     <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
               </Button>
            </CardContent>
         </Card>
      )
   }

   const o = rl as Record<string, unknown>
   if (o.not_found === true) {
      return (
         <Card className={className}>
            <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  IUCN Red List
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
               <p className="text-sm text-muted-foreground">
                  This scientific name was checked against the IUCN Red List API and no matching assessment was
                  found. You can still search the Red List website directly.
               </p>
               {formatFetchedAt(o.fetched_at) ? (
                  <p className="text-xs text-muted-foreground">Last checked: {formatFetchedAt(o.fetched_at)}</p>
               ) : null}
               <Button variant="outline" size="sm" asChild>
                  <a href={searchHref} target="_blank" rel="noopener noreferrer">
                     Search IUCN Red List
                     <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
               </Button>
            </CardContent>
         </Card>
      )
   }

   return (
      <Card className={cn('min-w-0 w-full', className)}>
         <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
               <Shield className="h-5 w-5 text-primary" />
               IUCN Red List
               {badge ? (
                  <span
                     className={cn('text-xs font-semibold px-2 py-0.5 rounded-md border', badge.className)}
                  >
                     {badge.title}
                  </span>
               ) : null}
            </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4 text-sm">
            <IucnRestAttributes o={o} categoryShownInBadge={Boolean(badge)} />

            <Tabs defaultValue="habitats" className="w-full">
               <div className="-mx-1 overflow-x-auto pb-2 px-1">
                  <TabsList className="inline-flex h-auto w-max max-w-none flex-wrap justify-start gap-1 bg-muted/60 p-1">
                     <TabsTrigger value="habitats" className="text-xs sm:text-sm shrink-0">
                        Habitats
                     </TabsTrigger>
                     <TabsTrigger value="threats" className="text-xs sm:text-sm shrink-0">
                        Threats
                     </TabsTrigger>
                     <TabsTrigger value="narratives" className="text-xs sm:text-sm shrink-0">
                        Narratives
                     </TabsTrigger>
                  </TabsList>
               </div>

               <TabsContent value="habitats" className="mt-3">
                  <div className={TAB_PANEL_CLASS}>
                     {habitatHtmlBlocks.length === 0 ? (
                        <p className="text-muted-foreground">No habitat data stored.</p>
                     ) : (
                        <div className="space-y-6">
                           {habitatHtmlBlocks.map((html, i) => (
                              <div key={`h-${i}`}>
                                 <HtmlChunk html={html} />
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </TabsContent>

               <TabsContent value="threats" className="mt-3">
                  <div className={TAB_PANEL_CLASS}>
                     {threatHtmlBlocks.length === 0 ? (
                        <p className="text-muted-foreground">No threat data stored.</p>
                     ) : (
                        <div className="space-y-6">
                           {threatHtmlBlocks.map((html, i) => (
                              <div key={`t-${i}`}>
                                 <HtmlChunk html={html} />
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </TabsContent>

               <TabsContent value="narratives" className="mt-3">
                  <div className={TAB_PANEL_CLASS}>
                     {narrativeEntries.length === 0 ? (
                        <p className="text-muted-foreground">No narrative text stored.</p>
                     ) : (
                        <div className="space-y-6">
                           {narrativeEntries.map(([key, text]) => (
                              <div key={key}>
                                 <h4 className="text-xs font-semibold text-muted-foreground mb-2 capitalize">
                                    {formatNarrativeLabel(key)}
                                 </h4>
                                 <HtmlChunk html={text.trim()} />
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </TabsContent>
            </Tabs>

            <Button variant="outline" size="sm" asChild>
               <a href={searchHref} target="_blank" rel="noopener noreferrer">
                  Open on IUCN Red List
                  <ExternalLink className="h-3 w-3 ml-1" />
               </a>
            </Button>
         </CardContent>
      </Card>
   )
}
