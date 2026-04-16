'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { CatalogMetadataPanel } from '@/components/catalog-explorer/catalog-metadata-panel'
import { CatalogRecordActions } from '@/components/catalog-explorer/catalog-record-actions'
import { ChromosomeOverview } from '@/components/genome-browser/chromosome-overview'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { fetchGenomeBrowserContext } from '@/lib/api/jbrowse'
import { fetchSampleLocations, parseSampleLocationsPayload } from '@/lib/api/coordinates'
import { inferAnnotationRowSource } from '@/lib/catalog-explorer/annotationMetadataSource'
import {
   assemblyBrowserAssemblyLevelFromRow,
   assemblyLevelSupportsGenomeBrowser,
} from '@/lib/catalog-explorer/assemblyGenomeBrowserEligibility'
import {
   cardHeaderDescription,
   cardHeaderTitle,
   useTaxidInDescription,
} from '@/lib/catalog-explorer/catalogRecordHeader'
import { isReferenceGenomeCategory } from '@/lib/catalog-explorer/catalogRecordCardLayout'
import { ModelIcon } from '@/lib/modelIcons'
import type { DataModels } from '@/lib/portal/types'
import {
   assemblyDescriptionFromDoc,
   assemblyExternalLinks,
   assemblyStatsRowsFromDoc,
} from '@/lib/genome-browser/assemblyBrowserDetails'
import { ncbiDatasetsGenomeUrl, ncbiGenomesAllDirectoryUrl } from '@/lib/ncbiAssemblyFtp'
import { formatCatalogCardCellValue, getNestedValue } from '@/lib/catalogQueryParams'
import { taxonomyTaxonHref } from '@/lib/taxonomyLinks'
import { cn } from '@/lib/utils'
import { Check, Clipboard, Download, ExternalLink, Loader2, Star } from 'lucide-react'

/** Large JSON blobs: shown on cards via structured fields / stats, not raw in the panel. */
const ASSEMBLY_METADATA_OMIT_IDS = new Set([
   'assembly_info',
   'organism',
   'assembly_stats',
   'wgs_info',
])

function CopyButton({ value, label }: { value: string; label: string }) {
   const [copied, setCopied] = useState(false)
   const handleCopy = useCallback(() => {
      void navigator.clipboard.writeText(value).then(() => {
         setCopied(true)
         const t = setTimeout(() => setCopied(false), 1500)
         return () => clearTimeout(t)
      })
   }, [value])
   return (
      <button
         type="button"
         title={label}
         aria-label={label}
         onClick={handleCopy}
         className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
         {copied ? (
            <Check className="h-3 w-3 text-primary" aria-hidden />
         ) : (
            <Clipboard className="h-3 w-3" aria-hidden />
         )}
      </button>
   )
}

function SectionHeader({ children }: { children: ReactNode }) {
   return (
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
         {children}
      </h4>
   )
}

type InfoRow = { label: string; value: string }

function DetailInfoGrid({ rows }: { rows: InfoRow[] }) {
   const visible = rows.filter((r) => r.value && r.value !== '—')
   if (visible.length === 0) return null
   return (
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-border px-3 py-2.5 text-xs">
         {visible.map((r) => (
            <div key={r.label} className="contents">
               <dt className="whitespace-nowrap text-muted-foreground">{r.label}</dt>
               <dd className="min-w-0 break-words font-mono">{r.value}</dd>
            </div>
         ))}
      </dl>
   )
}

/** Leaflet touches `window` at import time — must not load during SSR/prerender. */
const SpeciesLocationsMap = dynamic(
   () =>
      import('@/components/species-locations-map').then((mod) => ({
         default: mod.SpeciesLocationsMap,
      })),
   {
      ssr: false,
      loading: () => (
         <div className="flex h-[220px] items-center justify-center rounded-md border border-border bg-muted/20 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
         </div>
      ),
   },
)

function annotationSourceLabel(row: Record<string, unknown>, t: (key: string) => string): string {
   switch (inferAnnotationRowSource(row)) {
      case 'annotrieve':
         return t('catalog.annotationDetailAnnotrieve')
      case 'portal_custom':
         return t('catalog.annotationDetailPortal')
      default:
         return t('catalog.annotationDetailOther')
   }
}

function splitFtpUrls(raw: unknown): string[] {
   if (typeof raw !== 'string' || !raw.trim()) return []
   return raw
      .split(/[;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
}

function str(v: unknown): string {
   if (v == null) return ''
   return String(v).trim()
}

function val(row: Record<string, unknown>, key: string): string {
   return formatCatalogCardCellValue(getNestedValue(row, key))
}

function AssemblySection({
   row,
   taxid,
   t,
}: {
   row: Record<string, unknown>
   taxid: string
   t: (key: string) => string
}) {
   const acc = str(row.accession)
   const assemblyLevel = assemblyBrowserAssemblyLevelFromRow(row)
   const [ctxLoading, setCtxLoading] = useState(false)
   const [chrCtx, setChrCtx] = useState<Awaited<ReturnType<typeof fetchGenomeBrowserContext>> | null>(
      null,
   )
   const [ctxErr, setCtxErr] = useState<string | null>(null)

   useEffect(() => {
      if (!acc) return
      let cancelled = false
      setCtxLoading(true)
      setCtxErr(null)
      void fetchGenomeBrowserContext(acc)
         .then((c) => {
            if (!cancelled) setChrCtx(c)
         })
         .catch(() => {
            if (!cancelled) {
               setChrCtx(null)
               setCtxErr(t('catalog.detailAssemblyBrowserContextUnavailable'))
            }
         })
         .finally(() => {
            if (!cancelled) setCtxLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [acc])

   const statsRows = assemblyStatsRowsFromDoc(row)
   const extLinks = acc ? assemblyExternalLinks(acc, row) : []
   const ftpDir = acc ? ncbiGenomesAllDirectoryUrl(acc) : null
   const ncbiDataset = acc ? ncbiDatasetsGenomeUrl(acc) : null
   const desc = assemblyDescriptionFromDoc(row)

   const rowChroms = row.chromosomes
   const chromListFromRow = Array.isArray(rowChroms)
      ? rowChroms.map((c) => String(c).trim()).filter(Boolean)
      : []

   const annotations = chrCtx?.annotations ?? []
   const firstAnnName = annotations[0]?.name
   const showGenomeBrowserOpen =
      assemblyLevelSupportsGenomeBrowser(assemblyLevel) && Boolean(firstAnnName)

   const isRefGenome = isReferenceGenomeCategory(
      getNestedValue(row, 'metadata.assembly_info.refseq_category'),
   )

   const infoRows: InfoRow[] = [
      { label: 'Assembly level', value: val(row, 'metadata.assembly_info.assembly_level') },
      { label: 'Assembly type', value: val(row, 'metadata.assembly_info.assembly_type') },
      { label: 'Assembly status', value: val(row, 'metadata.assembly_info.assembly_status') },
      { label: 'Release date', value: val(row, 'metadata.assembly_info.release_date') },
      { label: 'Sequencing tech', value: val(row, 'metadata.assembly_info.sequencing_tech') },
   ]

   return (
      <div className="space-y-4">
         {isRefGenome ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-50/70 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-400">
               <Star className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden />
               {t('catalog.detailReferenceGenome')}
            </div>
         ) : null}

         <section>
            <SectionHeader>{t('catalog.detailAssemblyInfo')}</SectionHeader>
            <DetailInfoGrid rows={infoRows} />
         </section>

         {desc ? <p className="text-sm text-muted-foreground">{desc}</p> : null}

         <div className="flex flex-wrap gap-2">
            {ncbiDataset ? (
               <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={ncbiDataset} target="_blank" rel="noopener noreferrer">
                     <Download className="h-3.5 w-3.5" />
                     {t('catalog.detailDownloadNcbiDataset')}
                     <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </a>
               </Button>
            ) : null}
            {ftpDir ? (
               <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={ftpDir} target="_blank" rel="noopener noreferrer">
                     {t('catalog.detailBrowseNcbiFtp')}
                     <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </a>
               </Button>
            ) : null}
            {acc && showGenomeBrowserOpen ? (
               <Button variant="default" size="sm" asChild>
                  <Link
                     href={`/genome-browser?assembly=${encodeURIComponent(acc)}&annotation=${encodeURIComponent(firstAnnName!)}${taxid ? `&taxid=${encodeURIComponent(taxid)}` : ''}`}
                  >
                     {t('catalog.detailOpenFirstAnnotation')}
                  </Link>
               </Button>
            ) : null}
         </div>

         {statsRows.length > 0 ? (
            <section>
               <SectionHeader>{t('catalog.detailAssemblyStats')}</SectionHeader>
               <dl className="grid gap-1 rounded-md border border-border px-3 py-2 text-xs">
                  {statsRows.map((r) => (
                     <div key={r.label} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{r.label}</dt>
                        <dd className="text-right tabular-nums">{r.value}</dd>
                     </div>
                  ))}
               </dl>
            </section>
         ) : null}

         {ctxLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <Loader2 className="h-4 w-4 animate-spin" />
               {t('catalog.detailLoadingChromosomes')}
            </div>
         ) : null}
         {ctxErr && !ctxLoading ? <p className="text-xs text-muted-foreground">{ctxErr}</p> : null}

         {chrCtx && chrCtx.chromosomes.length > 0 ? (
            <section>
               <SectionHeader>{t('catalog.detailChromosomes')}</SectionHeader>
               <ChromosomeOverview chromosomes={chrCtx.chromosomes} variant="strip" />
            </section>
         ) : !ctxLoading && chromListFromRow.length > 0 ? (
            <section>
               <SectionHeader>{t('catalog.detailChromosomes')}</SectionHeader>
               <ul className="max-h-40 list-inside list-disc overflow-auto rounded-md border border-border px-3 py-2 text-xs font-mono">
                  {chromListFromRow.map((c) => (
                     <li key={c}>{c}</li>
                  ))}
               </ul>
            </section>
         ) : null}

         {extLinks.length > 0 ? (
            <section>
               <SectionHeader>{t('catalog.detailRelatedLinks')}</SectionHeader>
               <ul className="space-y-1.5 text-sm">
                  {extLinks.map((l) => (
                     <li key={l.href}>
                        <a
                           href={l.href}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-primary underline-offset-4 hover:underline"
                        >
                           {l.label}
                        </a>
                     </li>
                  ))}
               </ul>
            </section>
         ) : null}

         <CatalogMetadataPanel
            model="assemblies"
            metadata={row.metadata}
            omitSectionIds={ASSEMBLY_METADATA_OMIT_IDS}
         />
      </div>
   )
}

function BiosampleSection({
   row,
   taxid,
   t,
}: {
   row: Record<string, unknown>
   taxid: string
   t: (key: string) => string
}) {
   const acc = str(row.accession)
   const [loading, setLoading] = useState(false)
   const [points, setPoints] = useState<{ lat: number; lng: number }[]>([])

   useEffect(() => {
      if (!taxid || !acc) return
      let cancelled = false
      setLoading(true)
      void fetchSampleLocations({ taxid, sample_accession: acc, limit: 50 })
         .then((payload) => {
            if (cancelled) return
            const parsed = parseSampleLocationsPayload(payload.data)
            setPoints(parsed.map((p) => ({ lat: p.lat, lng: p.lng })))
         })
         .catch(() => {
            if (!cancelled) setPoints([])
         })
         .finally(() => {
            if (!cancelled) setLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [taxid, acc])

   const keyFactRows: InfoRow[] = [
      {
         label: 'Collection date',
         value:
            val(row, 'collection_date') ||
            val(row, 'metadata.collection date') ||
            val(row, 'metadata.collection_date'),
      },
      { label: 'Habitat', value: val(row, 'metadata.habitat') },
      {
         label: 'Country / sea',
         value:
            val(row, 'metadata.geographic location (country and/or sea)') ||
            val(row, 'metadata.geo_loc_name'),
      },
      { label: 'Locality', value: val(row, 'metadata.geographic location (region and locality)') },
      { label: 'Life stage', value: val(row, 'metadata.lifestage') },
      { label: 'Sex', value: val(row, 'metadata.sex') },
      { label: 'Organism part', value: val(row, 'metadata.organism part') },
      { label: 'Project', value: val(row, 'metadata.project name') },
   ]

   return (
      <div className="space-y-4">
         <section>
            <SectionHeader>{t('catalog.detailKeyFacts')}</SectionHeader>
            <DetailInfoGrid rows={keyFactRows} />
         </section>

         <section>
            <SectionHeader>{t('catalog.detailSampleMap')}</SectionHeader>
            {loading ? (
               <div className="flex h-[200px] items-center justify-center rounded-md border border-border bg-muted/20 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
               </div>
            ) : points.length > 0 ? (
               <SpeciesLocationsMap
                  points={points}
                  className="h-[220px] rounded-md border border-border"
               />
            ) : (
               <p className="text-sm text-muted-foreground">{t('catalog.detailNoSampleCoordinates')}</p>
            )}
         </section>

         <CatalogMetadataPanel model="biosamples" metadata={row.metadata} />
      </div>
   )
}

function ReadSection({ row, t }: { row: Record<string, unknown>; t: (key: string) => string }) {
   const meta = row.metadata
   const rec =
      meta && typeof meta === 'object' && !Array.isArray(meta) ? (meta as Record<string, unknown>) : null

   const fastq = rec ? splitFtpUrls(rec.fastq_ftp) : []
   const submitted = rec ? splitFtpUrls(rec.submitted_ftp) : []
   const asperaFq = rec ? splitFtpUrls(rec.fastq_aspera) : []
   const asperaSub = rec ? splitFtpUrls(rec.submitted_aspera) : []
   const allUrls = [...new Set([...fastq, ...submitted, ...asperaFq, ...asperaSub])]

   const libraryRows: InfoRow[] = [
      { label: 'Library strategy', value: val(row, 'metadata.library_strategy') },
      { label: 'Library source', value: val(row, 'metadata.library_source') },
      { label: 'Library layout', value: val(row, 'metadata.library_layout') },
      { label: 'Platform', value: val(row, 'metadata.instrument_platform') },
      { label: 'Instrument', value: val(row, 'metadata.instrument_model') },
      { label: 'Broker (ENA)', value: val(row, 'metadata.broker_name') },
      { label: 'First public', value: val(row, 'metadata.first_public') },
      { label: 'Read count', value: val(row, 'metadata.read_count') },
      { label: 'Base count', value: val(row, 'metadata.base_count') },
   ]

   return (
      <div className="space-y-4">
         <section>
            <SectionHeader>{t('catalog.detailLibraryInfo')}</SectionHeader>
            <DetailInfoGrid rows={libraryRows} />
         </section>

         {allUrls.length > 0 ? (
            <section>
               <SectionHeader>{t('catalog.detailReadFiles')}</SectionHeader>
               <ul className="space-y-2 text-sm">
                  {allUrls.map((url) => (
                     <li key={url} className="break-all">
                        <a
                           href={url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-primary underline-offset-4 hover:underline"
                        >
                           {url}
                        </a>
                     </li>
                  ))}
               </ul>
            </section>
         ) : (
            <p className="text-sm text-muted-foreground">{t('catalog.detailNoReadFiles')}</p>
         )}
         <CatalogMetadataPanel model="reads" metadata={row.metadata} />
      </div>
   )
}

function AnnotationSection({
   row,
   taxid,
   t,
}: {
   row: Record<string, unknown>
   taxid: string
   t: (key: string) => string
}) {
   const gff = str(row.gff_gz_location)
   const csi = str(row.tab_index_location)
   const taxidQs = taxid ? `&taxid=${encodeURIComponent(taxid)}` : ''
   const asm = str(row.assembly_accession)
   const annName = str(row.name)
   const source = inferAnnotationRowSource(row)

   const [asmCtxLoading, setAsmCtxLoading] = useState(false)
   const [asmChroms, setAsmChroms] = useState(0)

   useEffect(() => {
      if (!asm) {
         setAsmChroms(0)
         return
      }
      let cancelled = false
      setAsmCtxLoading(true)
      void fetchGenomeBrowserContext(asm)
         .then((c) => {
            if (!cancelled) setAsmChroms(c.chromosomes.length)
         })
         .catch(() => {
            if (!cancelled) setAsmChroms(0)
         })
         .finally(() => {
            if (!cancelled) setAsmCtxLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [asm])

   const showGenomeBrowser = Boolean(asm && annName && asmChroms > 0)

   const actionButtons = (
      <div className="flex flex-wrap items-center gap-2">
         {gff ? (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
               <a href={gff} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5" />
                  {t('catalog.detailDownloadGff')}
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
               </a>
            </Button>
         ) : null}
         {csi ? (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
               <a href={csi} target="_blank" rel="noopener noreferrer">
                  {t('catalog.detailDownloadTabix')}
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
               </a>
            </Button>
         ) : null}
         {asmCtxLoading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
               <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
               {t('catalog.detailLoadingChromosomes')}
            </span>
         ) : null}
         {showGenomeBrowser ? (
            <Button variant="default" size="sm" asChild>
               <Link
                  href={`/genome-browser?assembly=${encodeURIComponent(asm)}&annotation=${encodeURIComponent(annName)}${taxidQs}`}
               >
                  {t('catalog.openGenomeBrowser')}
               </Link>
            </Button>
         ) : null}
      </div>
   )

   if (source === 'annotrieve') {
      const buscoRows: InfoRow[] = [
         { label: 'Complete', value: val(row, 'metadata.busco.complete') },
         { label: 'Duplicated', value: val(row, 'metadata.busco.duplicated') },
         { label: 'Fragmented', value: val(row, 'metadata.busco.fragmented') },
         { label: 'Missing', value: val(row, 'metadata.busco.missing') },
         { label: 'Lineage', value: val(row, 'metadata.busco.busco_lineage') },
      ]
      const sourceRows: InfoRow[] = [
         { label: 'Database', value: val(row, 'metadata.source_file_info.database') },
         { label: 'Provider', value: val(row, 'metadata.source_file_info.provider') },
      ]
      const geneRows: InfoRow[] = [
         {
            label: 'Coding genes',
            value: val(
               row,
               'metadata.features_statistics.gene_category_stats.coding.total_count',
            ),
         },
         {
            label: 'Non-coding genes',
            value: val(
               row,
               'metadata.features_statistics.gene_category_stats.non_coding.total_count',
            ),
         },
         {
            label: 'Pseudogenes',
            value: val(
               row,
               'metadata.features_statistics.gene_category_stats.pseudogene.total_count',
            ),
         },
      ]
      return (
         <div className="space-y-4">
            {buscoRows.some((r) => r.value && r.value !== '—') ? (
               <section>
                  <SectionHeader>{t('catalog.detailBuscoStats')}</SectionHeader>
                  <DetailInfoGrid rows={buscoRows} />
               </section>
            ) : null}
            {sourceRows.some((r) => r.value && r.value !== '—') ? (
               <section>
                  <SectionHeader>{t('catalog.detailAnnotationSource')}</SectionHeader>
                  <DetailInfoGrid rows={sourceRows} />
               </section>
            ) : null}
            {geneRows.some((r) => r.value && r.value !== '—') ? (
               <section>
                  <SectionHeader>{t('catalog.detailGeneStats')}</SectionHeader>
                  <DetailInfoGrid rows={geneRows} />
               </section>
            ) : null}
            {actionButtons}
         </div>
      )
   }

   // portal_custom or other sources
   const metaRows: InfoRow[] = [
      { label: 'Assembly name', value: val(row, 'metadata.assembly_name') },
      { label: 'Organism name', value: val(row, 'metadata.organism_name') },
   ]
   return (
      <div className="space-y-4">
         {metaRows.some((r) => r.value && r.value !== '—') ? (
            <section>
               <SectionHeader>{t('catalog.detailAnnotationInfo')}</SectionHeader>
               <DetailInfoGrid rows={metaRows} />
            </section>
         ) : null}
         {actionButtons}
      </div>
   )
}

function LocalSampleSection({ row }: { row: Record<string, unknown> }) {
   const infoRows: InfoRow[] = [
      { label: 'Local ID', value: str(row.local_id) },
      { label: 'Scientific name', value: str(row.scientific_name) },
      { label: 'Taxon ID', value: str(row.taxid) },
      { label: 'Country', value: str(row.country) },
      { label: 'User', value: str(row.user) },
   ]
   return <DetailInfoGrid rows={infoRows} />
}

export type CatalogRecordDetailContentProps = {
   catalogKey: DataModels
   detailRow: Record<string, unknown>
   rootTaxid: string
   speciesHref: string | null
   t: (key: string) => string
   className?: string
   /**
    * When true, the identity block (model icon, title, description) is not rendered.
    * Use when the parent (e.g. the detail sheet) already provides a visible header.
    */
   hideHeader?: boolean
}

export function CatalogRecordDetailContent({
   catalogKey,
   detailRow,
   rootTaxid,
   speciesHref,
   t,
   className,
   hideHeader = false,
}: CatalogRecordDetailContentProps) {
   const taxid = detailRow.taxid != null ? String(detailRow.taxid).trim() : rootTaxid

   const body = (() => {
      switch (catalogKey) {
         case 'assemblies':
            return <AssemblySection row={detailRow} taxid={taxid} t={t} />
         case 'biosamples':
            return <BiosampleSection row={detailRow} taxid={taxid} t={t} />
         case 'reads':
            return <ReadSection row={detailRow} t={t} />
         case 'annotations':
            return <AnnotationSection row={detailRow} taxid={taxid} t={t} />
         case 'local_samples':
            return <LocalSampleSection row={detailRow} />
         default:
            return (
               <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/20 p-3 font-mono text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(detailRow, null, 2)}
               </pre>
            )
      }
   })()

   return (
      <div className={cn('space-y-4', className)}>
         {!hideHeader ? (
            <div className="space-y-3">
               <div className="flex min-w-0 items-start gap-3">
                  <span
                     className="flex shrink-0 pt-0.5 text-primary"
                     title={catalogKey.replace(/_/g, ' ')}
                     aria-hidden
                  >
                     <ModelIcon modelKey={catalogKey} className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                     <p className="sr-only">{catalogKey.replace(/_/g, ' ')}</p>
                     <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight">
                        {cardHeaderTitle(catalogKey, detailRow)}
                     </h3>
                     <p className="text-xs text-muted-foreground">
                        {useTaxidInDescription(catalogKey) ? (
                           <>taxid · {cardHeaderDescription(catalogKey, detailRow)}</>
                        ) : (
                           cardHeaderDescription(catalogKey, detailRow)
                        )}
                     </p>
                  </div>
               </div>
               {catalogKey === 'annotations' ? (
                  <span className="inline-block rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                     {annotationSourceLabel(detailRow, t)}
                  </span>
               ) : null}
            </div>
         ) : null}

         <div className="flex flex-wrap gap-2">
            {speciesHref ? (
               <Button variant="outline" size="sm" asChild>
                  <Link href={speciesHref}>{t('catalog.openSpeciesPage')}</Link>
               </Button>
            ) : (
               <Button variant="outline" size="sm" asChild>
                  <Link href={taxonomyTaxonHref(rootTaxid)}>{t('catalog.openTaxonomyView')}</Link>
               </Button>
            )}
            <CatalogRecordActions catalogKey={catalogKey} row={detailRow} t={t} />
         </div>

         <Separator />

         {body}

         <details className="rounded-md border border-border/60 bg-muted/10 p-2 text-xs">
            <summary className="flex cursor-pointer items-center justify-between font-medium text-muted-foreground">
               <span>{t('catalog.detailRawJson')}</span>
               <CopyButton
                  value={JSON.stringify(detailRow, null, 2)}
                  label={t('catalog.copyToClipboard')}
               />
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto font-mono whitespace-pre-wrap break-words p-1">
               {JSON.stringify(detailRow, null, 2)}
            </pre>
         </details>
      </div>
   )
}
