'use client'

import { useEffect, useState } from 'react'
import { Copy, Loader2, MapPin } from 'lucide-react'
import { toast } from 'sonner'

import { SpeciesLocationsMap } from '@/components/species-locations-map'
import { Button } from '@/components/ui/button'
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cmsGetSubmittedBioSample } from '@/lib/cms/services/auth'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { cn } from '@/lib/utils'

type CharEntry = { text?: string; unit?: string; ontologyTerms?: string[] }

function formatCharacteristicEntries(entries: unknown): string {
   if (!Array.isArray(entries)) return String(entries ?? '—')
   return entries
      .map((entry) => {
         if (entry && typeof entry === 'object' && 'text' in entry) {
            const o = entry as CharEntry
            let s = o.text ?? ''
            if (o.unit) s += ` ${o.unit}`
            if (o.ontologyTerms?.length) s += ` (${o.ontologyTerms.join(', ')})`
            return s.trim() || '—'
         }
         return String(entry)
      })
      .filter(Boolean)
      .join('; ')
}

function extractLatLngFromCharacteristics(characteristics: Record<string, unknown>): { lat: number; lng: number } | null {
   const keys = Object.keys(characteristics)
   const latKey = keys.find((k) => /latitude/i.test(k))
   const lonKey = keys.find((k) => /longitude/i.test(k))
   if (!latKey || !lonKey) return null

   const parseFirst = (raw: unknown): number | null => {
      if (!Array.isArray(raw) || raw.length === 0) return null
      const first = raw[0]
      if (!first || typeof first !== 'object') return null
      const t = (first as CharEntry).text
      if (t === undefined || t === null) return null
      const n = parseFloat(String(t).trim())
      return Number.isFinite(n) ? n : null
   }

   const lat = parseFirst(characteristics[latKey])
   const lng = parseFirst(characteristics[lonKey])
   if (lat === null || lng === null) return null
   return { lat, lng }
}

function MetaRow({ label, value }: { label: string; value: string }) {
   return (
      <div className="grid gap-1 sm:grid-cols-[minmax(8rem,11rem)_1fr] sm:gap-3">
         <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
         <dd className="min-w-0 break-words text-sm">{value}</dd>
      </div>
   )
}

export function SubmittedBiosampleDetailDialog({
   accession,
   open,
   onOpenChange,
}: {
   accession: string | null
   open: boolean
   onOpenChange: (open: boolean) => void
}) {
   const [loading, setLoading] = useState(false)
   const [record, setRecord] = useState<Record<string, unknown> | null>(null)
   const [error, setError] = useState<string | null>(null)

   useEffect(() => {
      if (!open || !accession) {
         setRecord(null)
         setError(null)
         return
      }
      let cancelled = false
      setLoading(true)
      setError(null)
      void cmsGetSubmittedBioSample(accession)
         .then((data) => {
            if (!cancelled) setRecord(data)
         })
         .catch((e) => {
            if (!cancelled) setError(extractApiMessage(e, 'Could not load biosample.'))
         })
         .finally(() => {
            if (!cancelled) setLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [open, accession])

   const acc = record?.accession != null ? String(record.accession) : accession ?? ''
   const characteristics =
      record?.characteristics && typeof record.characteristics === 'object' && !Array.isArray(record.characteristics)
         ? (record.characteristics as Record<string, unknown>)
         : null
   const latLng = characteristics ? extractLatLngFromCharacteristics(characteristics) : null
   const charEntries = characteristics ? Object.entries(characteristics).sort(([a], [b]) => a.localeCompare(b)) : []

   async function copyAccession() {
      if (!acc) return
      try {
         await navigator.clipboard.writeText(acc)
         toast.success('Accession copied')
      } catch {
         toast.error('Could not copy')
      }
   }

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent
            className={cn(
               'flex max-h-[min(90vh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl',
            )}
         >
            <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
               <DialogTitle className="pr-8">Submitted biosample</DialogTitle>
               <DialogDescription>
                  ENA BioSamples metadata. Copy the accession for assemblies, reads, or NCBI linking.
               </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-hidden">
               {loading ? (
                  <div className="flex justify-center py-16">
                     <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  </div>
               ) : error ? (
                  <p className="px-6 py-8 text-center text-sm text-destructive">{error}</p>
               ) : record ? (
                  <div className="flex max-h-[min(75vh,42rem)] flex-col gap-0 md:grid md:max-h-[min(75vh,42rem)] md:grid-cols-[1fr_min(280px,40%)] md:gap-0">
                     <ScrollArea className="h-[min(75vh,42rem)] md:h-full md:border-r md:border-border">
                        <div className="space-y-6 px-6 py-4">
                           <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Accession
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                 <code className="rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-sm">
                                    {acc || '—'}
                                 </code>
                                 <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="gap-1.5"
                                    disabled={!acc}
                                    onClick={() => void copyAccession()}
                                 >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy
                                 </Button>
                                 {acc ? (
                                    <Button size="sm" variant="outline" asChild>
                                       <a
                                          href={`https://www.ebi.ac.uk/biosamples/samples/${acc}`}
                                          target="_blank"
                                          rel="noreferrer"
                                       >
                                          Open in BioSamples
                                       </a>
                                    </Button>
                                 ) : null}
                              </div>
                           </div>

                           <dl className="space-y-3">
                              <MetaRow label="Sample name" value={String(record.name ?? '—')} />
                              <MetaRow label="Scientific name" value={String(record.scientific_name ?? '—')} />
                              <MetaRow label="Taxid" value={String(record.taxid ?? '—')} />
                              <MetaRow label="Status" value={String(record.status ?? '—')} />
                              <MetaRow label="Submitted by" value={String(record.user ?? '—')} />
                              {record.sraAccession != null ? (
                                 <MetaRow label="SRA accession" value={String(record.sraAccession)} />
                              ) : null}
                              {record.submittedVia != null ? (
                                 <MetaRow label="Submitted via" value={String(record.submittedVia)} />
                              ) : null}
                              {record.webinSubmissionAccountId != null ? (
                                 <MetaRow label="Webin account" value={String(record.webinSubmissionAccountId)} />
                              ) : null}
                              {record.create != null ? <MetaRow label="Created" value={String(record.create)} /> : null}
                              {record.submitted != null ? <MetaRow label="Submitted" value={String(record.submitted)} /> : null}
                              {record.update != null ? <MetaRow label="Updated" value={String(record.update)} /> : null}
                              {record.release != null ? <MetaRow label="Released" value={String(record.release)} /> : null}
                           </dl>

                           {charEntries.length > 0 ? (
                              <div className="space-y-2 border-t border-border pt-4">
                                 <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Characteristics
                                 </p>
                                 <dl className="space-y-3">
                                    {charEntries.map(([key, val]) => (
                                       <MetaRow
                                          key={key}
                                          label={key}
                                          value={formatCharacteristicEntries(val)}
                                       />
                                    ))}
                                 </dl>
                              </div>
                           ) : null}
                        </div>
                     </ScrollArea>

                     <div className="flex min-h-[200px] flex-col border-t border-border md:border-t-0 md:border-l">
                        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                           <MapPin className="h-4 w-4 text-muted-foreground" />
                           <span className="text-xs font-semibold">Location</span>
                        </div>
                        <div className="relative min-h-[220px] flex-1 bg-muted/20">
                           {latLng ? (
                              <SpeciesLocationsMap
                                 points={[{ lat: latLng.lat, lng: latLng.lng }]}
                                 className="h-[min(240px,40vh)] min-h-[200px] rounded-none border-0"
                              />
                           ) : (
                              <div className="flex h-[min(240px,40vh)] min-h-[200px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                 No latitude / longitude in sample characteristics.
                              </div>
                           )}
                        </div>
                        {latLng ? (
                           <p className="border-t border-border bg-muted/30 px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                              {latLng.lat.toFixed(5)}, {latLng.lng.toFixed(5)}
                           </p>
                        ) : null}
                     </div>
                  </div>
               ) : (
                  <p className="px-6 py-8 text-center text-sm text-muted-foreground">No data.</p>
               )}
            </div>
         </DialogContent>
      </Dialog>
   )
}
