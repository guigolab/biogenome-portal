'use client'

import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/contexts/locale-context'
import { iucnRedListBadge } from '@/lib/iucnCategory'
import { sanitizeIucnHtmlFragment } from '@/lib/sanitizeIucnHtml'
import { cn } from '@/lib/utils'
import { ExternalLink, Shield } from 'lucide-react'

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

function OpenOnIucnButton({ href, label }: { href: string; label: string }) {
   return (
      <Button variant="outline" size="sm" asChild>
         <a href={href} target="_blank" rel="noopener noreferrer">
            {label}
            <ExternalLink className="h-3 w-3 ml-1" />
         </a>
      </Button>
   )
}

type SpeciesIucnSectionProps = {
   organism: Record<string, unknown>
   scientificName: string
   className?: string
}

export function SpeciesIucnSection({ organism, scientificName, className }: SpeciesIucnSectionProps) {
   const { t } = useLocale()
   const rl = organism.iucn_redlist
   const badge = iucnRedListBadge(organism)
   const searchHref = `https://www.iucnredlist.org/search?query=${encodeURIComponent(scientificName)}`
   const openLabel = t('iucn.openOnRedList')

   const narrativeEntries = useMemo(() => {
      if (!rl || typeof rl !== 'object') return [] as [string, string][]
      const o = rl as Record<string, unknown>
      if (o.not_found === true) return []
      const narratives =
         o.narratives && typeof o.narratives === 'object' ? (o.narratives as Record<string, unknown>) : {}
      return Object.entries(narratives).filter(
         ([, v]) => typeof v === 'string' && v.trim().length > 0,
      ) as [string, string][]
   }, [rl])

   if (!rl || typeof rl !== 'object') {
      return (
         <Card className={className}>
            <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  IUCN Red List
               </CardTitle>
               <CardAction>
                  <OpenOnIucnButton href={searchHref} label={openLabel} />
               </CardAction>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground">
                  No Red List assessment is stored for this taxon yet. Open the Red List to look up the species
                  manually.
               </p>
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
               <CardAction>
                  <OpenOnIucnButton href={searchHref} label={openLabel} />
               </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
               <p className="text-sm text-muted-foreground">
                  This scientific name was checked against the IUCN Red List API and no matching assessment was
                  found. You can still search the Red List website directly.
               </p>
               {formatFetchedAt(o.fetched_at) ? (
                  <p className="text-xs text-muted-foreground">Last checked: {formatFetchedAt(o.fetched_at)}</p>
               ) : null}
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
            <CardAction>
               <OpenOnIucnButton href={searchHref} label={openLabel} />
            </CardAction>
         </CardHeader>
         <CardContent className="text-sm">
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
         </CardContent>
      </Card>
   )
}
