import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { iucnRedListBadge } from '@/lib/iucnCategory'
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
   }
   return null
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

type SpeciesIucnSectionProps = {
   organism: Record<string, unknown>
   scientificName: string
}

export function SpeciesIucnSection({ organism, scientificName }: SpeciesIucnSectionProps) {
   const rl = organism.iucn_redlist
   const badge = iucnRedListBadge(organism)
   const searchHref = `https://www.iucnredlist.org/search?query=${encodeURIComponent(scientificName)}`

   if (!rl || typeof rl !== 'object') {
      return (
         <Card>
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
         <Card>
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

   const habitats = Array.isArray(o.habitats) ? o.habitats : []
   const threats = Array.isArray(o.threats) ? o.threats : []
   const narratives = o.narratives && typeof o.narratives === 'object' ? (o.narratives as Record<string, unknown>) : {}

   const habitatLines: string[] = []
   for (const h of habitats) {
      if (h && typeof h === 'object') {
         const line = lineFromApiDict(h as Record<string, unknown>)
         if (line) habitatLines.push(line)
      }
   }
   const threatLines: string[] = []
   for (const t of threats) {
      if (t && typeof t === 'object') {
         const line = lineFromApiDict(t as Record<string, unknown>)
         if (line) threatLines.push(line)
      }
   }

   const narrativeEntries = Object.entries(narratives).filter(
      ([, v]) => typeof v === 'string' && v.trim().length > 0,
   ) as [string, string][]

   return (
      <Card>
         <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
               <Shield className="h-5 w-5 text-primary" />
               IUCN Red List
               {badge ? (
                  <span
                     className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-md border',
                        badge.className,
                     )}
                  >
                     {badge.title}
                  </span>
               ) : null}
            </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
               {str(o.population_trend) ? (
                  <>
                     <dt className="text-muted-foreground">Population trend</dt>
                     <dd className="font-medium">{str(o.population_trend)}</dd>
                  </>
               ) : null}
               {str(o.assessment_date) ? (
                  <>
                     <dt className="text-muted-foreground">Assessment date</dt>
                     <dd className="font-medium">{str(o.assessment_date)}</dd>
                  </>
               ) : null}
               {str(o.published_year) ? (
                  <>
                     <dt className="text-muted-foreground">Year published</dt>
                     <dd className="font-medium">{str(o.published_year)}</dd>
                  </>
               ) : null}
               {formatFetchedAt(o.fetched_at) ? (
                  <>
                     <dt className="text-muted-foreground">Data synced</dt>
                     <dd className="font-medium text-muted-foreground">{formatFetchedAt(o.fetched_at)}</dd>
                  </>
               ) : null}
            </dl>

            {habitatLines.length > 0 ? (
               <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                     Habitats
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                     {habitatLines.slice(0, 12).map((line) => (
                        <li key={line}>{line}</li>
                     ))}
                  </ul>
                  {habitatLines.length > 12 ? (
                     <p className="text-xs text-muted-foreground mt-1">
                        +{habitatLines.length - 12} more (see IUCN for full detail)
                     </p>
                  ) : null}
               </div>
            ) : null}

            {threatLines.length > 0 ? (
               <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                     Threats
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                     {threatLines.slice(0, 12).map((line) => (
                        <li key={line}>{line}</li>
                     ))}
                  </ul>
                  {threatLines.length > 12 ? (
                     <p className="text-xs text-muted-foreground mt-1">
                        +{threatLines.length - 12} more (see IUCN for full detail)
                     </p>
                  ) : null}
               </div>
            ) : null}

            {narrativeEntries.length > 0 ? (
               <div className="space-y-3 border-t border-border pt-4">
                  {narrativeEntries.map(([key, text]) => (
                     <div key={key}>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1 capitalize">
                           {key.replace(/^supplementary_/, '').replace(/_/g, ' ')}
                        </h4>
                        <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
                     </div>
                  ))}
               </div>
            ) : null}

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
