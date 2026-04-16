'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ChromosomeOverview } from '@/components/genome-browser/chromosome-overview'
import {
   JbrowseLinearView,
   type JbrowseSelectedChromosome,
} from '@/components/genome-browser/jbrowse-linear-view'
import { chromosomeRowToJbrowseSelection, useGenomeBrowserSelection } from '@/components/genome-browser/use-genome-browser-selection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLocale } from '@/contexts/locale-context'
import { type GenomeAnnotationRow } from '@/lib/api/assemblies'
import { fetchJBrowseSessions, type JBrowseSessionRow } from '@/lib/api/jbrowse'
import { getApiBase } from '@/lib/api/taxon'
import {
   annotationOverviewFromRow,
   indexedFileInfoFromMetadata,
   sourceFileInfoFromMetadata,
} from '@/lib/genome-browser/annotationBrowserDetails'
import {
   annotationStableTrackId,
   annotationTrackDisplayName,
} from '@/lib/genome-browser/annotationLabels'
import {
   assemblyDescriptionFromDoc,
   assemblyExternalLinks,
   assemblyStatsRowsFromDoc,
} from '@/lib/genome-browser/assemblyBrowserDetails'
import { buildDefaultSession, type ChromosomeRow } from '@/lib/genome-browser/buildDefaultSession'
import { assemblyFromDoc } from '@/lib/species-detail-from-organism'
import { navRouteIcons } from '@/lib/portal'
import { taxonomyTaxonHref } from '@/lib/taxonomyLinks'
import { cn } from '@/lib/utils'
import {
   ChevronsLeft,
   ChevronsRight,
   Dna,
   Download,
   ExternalLink,
   Layers,
   Loader2,
   PanelRight,
   PanelRightClose,
   Search,
   Star,
} from 'lucide-react'
import { useIsMobile } from '@/components/ui/use-mobile'

const PAGE_SIZE = 10

function normalizeQueryParam(value: string | null): string | undefined {
   if (value == null || value === '') return undefined
   return value
}

function formatFileSize(n: number | undefined): string {
   if (n == null || !Number.isFinite(n)) return ''
   if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`
   if (n >= 1e6) return `${(n / 1e6).toFixed(2)} MB`
   if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
   return `${n} B`
}

export function GenomeBrowserPageClient() {
   const { t } = useLocale()
   const router = useRouter()
   const pathname = usePathname()
   const searchParams = useSearchParams()

   const taxid = normalizeQueryParam(searchParams.get('taxid'))
   const assemblyParam = normalizeQueryParam(searchParams.get('assembly'))
   const annotationParam = normalizeQueryParam(searchParams.get('annotation'))

   const [searchInput, setSearchInput] = useState('')
   const [debouncedFilter, setDebouncedFilter] = useState('')

   const [sessions, setSessions] = useState<JBrowseSessionRow[]>([])
   const [sessionsTotal, setSessionsTotal] = useState(0)
   const [sessionsLoading, setSessionsLoading] = useState(true)
   const [sessionsLoadingMore, setSessionsLoadingMore] = useState(false)
   const [sessionsError, setSessionsError] = useState<string | null>(null)

   const [sessionsPanelExpanded, setSessionsPanelExpanded] = useState(true)
   const [detailsPanelOpen, setDetailsPanelOpen] = useState(false)
   const [detailsSheetOpen, setDetailsSheetOpen] = useState(false)
   const isMobile = useIsMobile()

   const listScrollRef = useRef<HTMLDivElement>(null)
   const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
   const loadMoreInFlightRef = useRef(false)

   const apiBase = useMemo(() => getApiBase(), [])

   useEffect(() => {
      const tmr = setTimeout(() => setDebouncedFilter(searchInput.trim()), 250)
      return () => clearTimeout(tmr)
   }, [searchInput])

   useEffect(() => {
      let cancelled = false
      setSessions([])
      setSessionsTotal(0)
      setSessionsLoading(true)
      setSessionsError(null)
      void fetchJBrowseSessions({
         limit: PAGE_SIZE,
         offset: 0,
         filter: debouncedFilter || undefined,
         taxon_lineage: taxid,
         sort_column: 'accession',
         sort_order: 'asc',
      })
         .then((res) => {
            if (cancelled) return
            setSessions(res.data)
            setSessionsTotal(res.total)
         })
         .catch((e) => {
            if (!cancelled) {
               setSessionsError(e instanceof Error ? e.message : 'Failed to load assemblies')
               setSessions([])
               setSessionsTotal(0)
            }
         })
         .finally(() => {
            if (!cancelled) setSessionsLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [debouncedFilter, taxid])

   const loadMoreSessions = useCallback(async () => {
      if (sessionsLoadingMore || sessionsLoading) return
      setSessionsLoadingMore(true)
      setSessionsError(null)
      try {
         const res = await fetchJBrowseSessions({
            limit: PAGE_SIZE,
            offset: sessions.length,
            filter: debouncedFilter || undefined,
            taxon_lineage: taxid,
            sort_column: 'accession',
            sort_order: 'asc',
         })
         setSessions((prev) => {
            const seen = new Set(prev.map((s) => s.accession))
            const merged = [...prev]
            for (const s of res.data) {
               if (!seen.has(s.accession)) {
                  seen.add(s.accession)
                  merged.push(s)
               }
            }
            return merged
         })
         setSessionsTotal(res.total)
      } catch (e) {
         setSessionsError(e instanceof Error ? e.message : 'Failed to load more assemblies')
      } finally {
         setSessionsLoadingMore(false)
      }
   }, [sessionsLoadingMore, sessionsLoading, sessions.length, debouncedFilter, taxid])

   const loadMoreSessionsRef = useRef(loadMoreSessions)
   loadMoreSessionsRef.current = loadMoreSessions

   useEffect(() => {
      if (!sessionsPanelExpanded) return
      const root = listScrollRef.current
      const target = loadMoreSentinelRef.current
      if (!root || !target) return
      const obs = new IntersectionObserver(
         (entries) => {
            if (!entries[0]?.isIntersecting) return
            if (loadMoreInFlightRef.current) return
            if (sessions.length >= sessionsTotal) return
            loadMoreInFlightRef.current = true
            void loadMoreSessionsRef.current().finally(() => {
               loadMoreInFlightRef.current = false
            })
         },
         { root, rootMargin: '80px', threshold: 0 },
      )
      obs.observe(target)
      return () => obs.disconnect()
   }, [sessions.length, sessionsTotal, sessionsPanelExpanded])

   const replaceQuery = useCallback(
      (next: Record<string, string | undefined>) => {
         const sp = new URLSearchParams(searchParams.toString())
         for (const [k, v] of Object.entries(next)) {
            if (v === undefined || v === '') sp.delete(k)
            else sp.set(k, v)
         }
         const qs = sp.toString()
         router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      },
      [pathname, router, searchParams],
   )

   const {
      selectedAssemblyDoc,
      chromosomes,
      annotations,
      selectionLoading,
      selectionError,
      selectedChrIds,
      setSelectedChrIds,
      loadSelection,
   } = useGenomeBrowserSelection({
      assemblyParam,
      annotationParam,
      taxid,
      replaceQuery,
   })

   const clearAssembly = useCallback(() => {
      setDetailsSheetOpen(false)
      replaceQuery({ assembly: undefined, annotation: undefined })
   }, [replaceQuery])

   const handleDetailsToggle = useCallback(() => {
      if (isMobile) {
         setDetailsSheetOpen(true)
      } else {
         setDetailsPanelOpen((prev) => !prev)
      }
   }, [isMobile])

   const assemblyForJBrowse = useMemo(() => {
      if (!selectedAssemblyDoc?.accession) return null
      return {
         accession: String(selectedAssemblyDoc.accession),
         assembly_name:
            typeof selectedAssemblyDoc.assembly_name === 'string'
               ? selectedAssemblyDoc.assembly_name
               : undefined,
      }
   }, [selectedAssemblyDoc])

   const jbrowseAssemblyDisplayName = useMemo(() => {
      const fromAnn = annotations[0]?.assembly_name
      if (typeof fromAnn === 'string' && fromAnn.trim()) return fromAnn.trim()
      return assemblyForJBrowse?.assembly_name || assemblyForJBrowse?.accession || ''
   }, [annotations, assemblyForJBrowse])

   const hasGffAnnotations = annotations.some((a) => a.gff_gz_location && a.tab_index_location)

   const defaultSession = useMemo(() => {
      if (!assemblyForJBrowse || chromosomes.length === 0) return null
      if (!hasGffAnnotations) return null
      return buildDefaultSession(assemblyForJBrowse.accession, annotations, chromosomes)
   }, [assemblyForJBrowse, annotations, chromosomes, hasGffAnnotations])

   const defaultChromosomeNav = useMemo((): JbrowseSelectedChromosome | null => {
      if (!assemblyForJBrowse || chromosomes.length === 0) return null
      return chromosomeRowToJbrowseSelection(chromosomes[0])
   }, [assemblyForJBrowse, chromosomes])

   /** LGV is source of truth: highlight the contig it is actually displaying. */
   const syncChromosomeStripFromBrowser = useCallback(
      (refName: string) => {
         const tr = refName.trim()
         if (!tr) return
         const row = chromosomes.find(
            (c) => c.jbrowse_ref_name.trim().toLowerCase() === tr.toLowerCase(),
         )
         if (row) setSelectedChrIds([row.accession_version])
      },
      [chromosomes, setSelectedChrIds],
   )

   const selectedChromosomeForJBrowse = useMemo((): JbrowseSelectedChromosome | null => {
      if (selectedChrIds.length !== 1) return null
      const chr = chromosomes.find((c) => c.accession_version === selectedChrIds[0])
      return chr ? chromosomeRowToJbrowseSelection(chr) : null
   }, [selectedChrIds, chromosomes])

   const hasMore = sessions.length < sessionsTotal

   const selectedChromosomeSummary = useMemo(() => {
      if (selectedChrIds.length !== 1) return null
      const chr = chromosomes.find((c) => c.accession_version === selectedChrIds[0])
      if (!chr) return null
      return chr.jbrowse_ref_name
   }, [selectedChrIds, chromosomes])

   /** When nothing is selected, show the same first contig the browser navigates to. */
   const chromosomeStripSummary = selectedChromosomeSummary ?? defaultChromosomeNav?.chr_name ?? null

   const assemblyLoaded = !!assemblyForJBrowse && !selectionLoading && !selectionError
   const GenomePageIcon = navRouteIcons.genomeBrowser

   const detailsContent = (
      <SessionDetailsPanel
         assemblyDoc={selectedAssemblyDoc ?? undefined}
         accession={assemblyForJBrowse?.accession}
         assemblyName={assemblyForJBrowse?.assembly_name || assemblyForJBrowse?.accession}
         annotations={annotations}
         jbrowseAssemblyDisplayName={jbrowseAssemblyDisplayName}
      />
   )

   return (
      <div className="bg-background flex h-full min-h-0 flex-1 flex-col overflow-hidden">
         <header className="border-border from-background to-muted/20 shrink-0 border-b bg-gradient-to-b px-4 py-4 sm:py-5">
            <h1 className="text-foreground mb-1 flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
               <GenomePageIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
               {t('genomeBrowser.title')}
            </h1>
            <div className="text-muted-foreground max-w-3xl space-y-2 text-sm leading-relaxed">
               <p>{t('genomeBrowser.description')}</p>
            </div>
            {taxid ? (
               <div className="border-border bg-muted/40 mt-3 inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border px-3 py-2 text-sm">
                  <span className="text-foreground font-medium">{t('genomeBrowser.contextLabel')}</span>
                  <Link
                     href={taxonomyTaxonHref(taxid)}
                     className="text-primary font-medium underline-offset-4 hover:underline"
                  >
                     {t('genomeBrowser.contextTaxonLink')}
                  </Link>
                  <span className="text-muted-foreground">
                     ({t('genomeBrowser.taxId')} {taxid})
                  </span>
               </div>
            ) : null}
         </header>

         {/* Flex row: sessions | main | details */}
         <div className="flex min-h-0 flex-1 overflow-hidden">

            {/* ── Left panel: sessions ── */}
            {sessionsPanelExpanded ? (
               <aside
                  aria-label={t('genomeBrowser.sessionsTitle')}
                  className={cn(
                     'bg-card border-border flex flex-col overflow-hidden shrink-0',
                     /* mobile: horizontal strip at top */
                     'max-h-[min(42vh,460px)] w-full border-b',
                     /* lg+: fixed-width side column */
                     'lg:max-h-none lg:w-[280px] lg:border-b-0 lg:border-r',
                  )}
               >
                  {/* Sidebar header */}
                  <div className="border-border shrink-0 border-b px-4 pt-4 pb-3 space-y-3">
                     <div className="space-y-1.5">
                        <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                           <span className="bg-primary/10 text-primary inline-flex h-7 w-7 items-center justify-center rounded-lg shrink-0">
                              <Dna className="h-3.5 w-3.5" aria-hidden />
                           </span>
                           {t('genomeBrowser.sessionsTitle')}
                        </div>
                        <p className="text-muted-foreground text-[0.7rem] leading-snug">
                           {t('genomeBrowser.sessionsPanelScope')}
                        </p>
                     </div>
                     <div className="relative">
                        <Search
                           className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
                           aria-hidden
                        />
                        <Input
                           className="h-9 pl-9"
                           placeholder={t('genomeBrowser.searchPlaceholder')}
                           value={searchInput}
                           onChange={(e) => setSearchInput(e.target.value)}
                           aria-label={t('genomeBrowser.searchPlaceholder')}
                        />
                     </div>
                  </div>

                  {sessionsError ? (
                     <div
                        className="bg-destructive/10 text-destructive shrink-0 px-4 py-2 text-sm"
                        role="alert"
                     >
                        {sessionsError}
                     </div>
                  ) : null}

                  <div
                     ref={listScrollRef}
                     className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
                  >
                     {sessionsLoading && sessions.length === 0 ? (
                        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                           <Loader2 className="h-4 w-4 animate-spin" />
                           {t('genomeBrowser.loadingSessions')}
                        </div>
                     ) : sessions.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center text-sm">
                           <div className="bg-muted/50 rounded-full p-3">
                              <Dna className="h-8 w-8 opacity-50" aria-hidden />
                           </div>
                           <p className="max-w-[18rem] leading-relaxed">{t('genomeBrowser.noSessions')}</p>
                        </div>
                     ) : (
                        <ul className="flex flex-col gap-2.5" role="list">
                           {sessions.map((s) => {
                              const active = s.accession === assemblyParam
                              return (
                                 <li key={s.accession} className="list-none">
                                    <button
                                       type="button"
                                       onClick={() => void loadSelection(s.accession)}
                                       className={cn(
                                          'border-border w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200',
                                          'focus-visible:ring-ring focus-visible:ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                          active
                                             ? 'border-primary/60 bg-primary/10 shadow-sm ring-2 ring-primary/25'
                                             : 'bg-background hover:border-primary/35 hover:bg-muted/50 active:scale-[0.99]',
                                       )}
                                       aria-pressed={active}
                                       aria-current={active ? 'true' : undefined}
                                    >
                                       <div className="flex items-start gap-2">
                                          <Dna className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                                          <div className="min-w-0 flex-1">
                                             <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                                                <span className="truncate font-medium">
                                                   {s.assembly_name || s.accession}
                                                </span>
                                                {s.annotations?.length ? (
                                                   <Badge
                                                      variant="secondary"
                                                      className="h-5 shrink-0 px-1.5 py-0 text-xs"
                                                   >
                                                      {s.annotations.length}
                                                   </Badge>
                                                ) : null}
                                             </div>
                                             <p className="text-muted-foreground truncate text-xs italic">
                                                {s.scientific_name || '—'}
                                             </p>
                                             <p className="text-muted-foreground font-mono text-[0.65rem]">
                                                {s.accession}
                                             </p>
                                          </div>
                                       </div>
                                    </button>
                                 </li>
                              )
                           })}
                        </ul>
                     )}
                     {hasMore ? (
                        <div
                           ref={loadMoreSentinelRef}
                           className="flex min-h-10 w-full flex-col items-center justify-center py-2"
                           aria-hidden
                        >
                           {sessionsLoadingMore ? (
                              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                           ) : (
                              <span className="text-muted-foreground/70 text-[10px]">
                                 {t('genomeBrowser.scrollForMore')}
                              </span>
                           )}
                        </div>
                     ) : null}
                  </div>

                  <div className="border-border bg-muted/30 shrink-0 space-y-2 border-t px-4 py-3">
                     <p className="text-muted-foreground text-xs">
                        {t('genomeBrowser.results')}:{' '}
                        <strong className="text-foreground tabular-nums">{sessionsTotal}</strong>
                        {sessions.length < sessionsTotal ? (
                           <span>
                              {' '}
                              · {t('genomeBrowser.showing')} {sessions.length}
                           </span>
                        ) : null}
                     </p>
                     {hasMore ? (
                        <Button
                           type="button"
                           variant="secondary"
                           size="sm"
                           className="h-9 w-full font-medium"
                           onClick={loadMoreSessions}
                           disabled={sessionsLoadingMore || sessionsLoading}
                        >
                           {sessionsLoadingMore ? (
                              <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 {t('genomeBrowser.loadingMoreAssemblies')}
                              </>
                           ) : (
                              t('genomeBrowser.loadMoreAssemblies')
                           )}
                        </Button>
                     ) : null}
                  </div>
               </aside>
            ) : null}

            {/* ── Main: overview + JBrowse ── */}
            <main
               className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden"
               aria-label={t('genomeBrowser.linearGenomeView')}
            >
               {!assemblyParam ? (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
                     {/* Sessions toggle when panel is hidden */}
                     {!sessionsPanelExpanded ? (
                        <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           className="mb-6 gap-1.5"
                           onClick={() => setSessionsPanelExpanded(true)}
                        >
                           <ChevronsRight className="h-4 w-4" />
                           {t('genomeBrowser.showSessionList')}
                        </Button>
                     ) : null}
                     <div className="bg-muted/50 mb-5 rounded-2xl p-5 shadow-inner">
                        <Dna className="text-primary h-10 w-10" aria-hidden />
                     </div>
                     <h3 className="mb-2 text-lg font-semibold tracking-tight">
                        {t('genomeBrowser.emptyTitle')}
                     </h3>
                     <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                        {t('genomeBrowser.emptyBody')}
                     </p>
                  </div>
               ) : selectionLoading ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
                     <Loader2 className="text-primary h-10 w-10 animate-spin" aria-hidden />
                     <p className="text-muted-foreground text-sm">{t('genomeBrowser.loadingAssembly')}</p>
                  </div>
               ) : selectionError || !assemblyForJBrowse ? (
                  <div
                     className="border-destructive/30 bg-destructive/5 m-4 flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center"
                     role="alert"
                  >
                     <p className="text-destructive text-sm font-medium">
                        {selectionError || t('genomeBrowser.loadFailed')}
                     </p>
                     <Button type="button" variant="outline" size="sm" onClick={clearAssembly}>
                        {t('genomeBrowser.clearAssembly')}
                     </Button>
                  </div>
               ) : (
                  <>
                     {/* Overview band — compact, shrink-0 */}
                     <SessionOverviewBand
                        assemblyDoc={selectedAssemblyDoc!}
                        accession={assemblyForJBrowse.accession}
                        assemblyName={assemblyForJBrowse.assembly_name || assemblyForJBrowse.accession}
                        jbrowseAssemblyDisplayName={jbrowseAssemblyDisplayName}
                        annotations={annotations}
                        chromosomes={chromosomes}
                        selectedChrIds={selectedChrIds}
                        onChrSelect={(chr) => setSelectedChrIds([chr.accession_version])}
                        selectedChromosomeSummary={chromosomeStripSummary}
                        sessionsPanelExpanded={sessionsPanelExpanded}
                        onToggleSessions={() => setSessionsPanelExpanded((prev) => !prev)}
                        detailsPanelOpen={detailsPanelOpen}
                        onToggleDetails={handleDetailsToggle}
                     />

                     {/* JBrowse viewer — fills remaining height */}
                     <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {defaultSession ? (
                           <JbrowseLinearView
                              apiBase={apiBase}
                              annotationAssemblyDisplayName={jbrowseAssemblyDisplayName}
                              assembly={assemblyForJBrowse}
                              chromosomes={chromosomes}
                              annotations={annotations}
                              defaultSession={defaultSession as Record<string, unknown>}
                              defaultChromosomeNav={defaultChromosomeNav}
                              selectedChromosome={selectedChromosomeForJBrowse}
                              onBrowserPrimaryRefName={syncChromosomeStripFromBrowser}
                           />
                        ) : annotations.length > 0 && !hasGffAnnotations ? (
                           <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                              <Layers className="text-muted-foreground h-10 w-10 opacity-40" />
                              <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                                 {t('genomeBrowser.gffNotConfigured')}
                              </p>
                           </div>
                        ) : chromosomes.length > 0 ? (
                           <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                              <Dna className="text-muted-foreground h-10 w-10 opacity-40" />
                              <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                                 {t('genomeBrowser.emptyBody')}
                              </p>
                           </div>
                        ) : (
                           <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                              <p className="text-muted-foreground text-sm">
                                 {t('genomeBrowser.tryAnotherAssembly')}
                              </p>
                           </div>
                        )}
                     </div>
                  </>
               )}
            </main>

            {/* ── Right panel: details (lg+ only, hidden by default) ── */}
            {detailsPanelOpen ? (
               <aside
                  aria-label={t('genomeBrowser.sessionDetails')}
                  className="border-border hidden min-h-0 w-[340px] shrink-0 overflow-y-auto overscroll-contain border-l lg:flex lg:flex-col"
               >
                  {detailsContent}
               </aside>
            ) : null}
         </div>

         {/* Mobile Sheet for details */}
         <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
            <SheetContent side="right" className="w-full max-w-lg overflow-y-auto p-0 sm:max-w-xl">
               <SheetHeader className="border-border border-b px-4 py-4">
                  <SheetTitle className="text-base font-semibold">
                     {t('genomeBrowser.sessionDetails')}
                  </SheetTitle>
               </SheetHeader>
               <div className="overflow-y-auto px-4 py-4">{assemblyLoaded ? detailsContent : null}</div>
            </SheetContent>
         </Sheet>
      </div>
   )
}

// ─────────────────────────────────────────────────────────────────────────────
// SessionOverviewBand
// ─────────────────────────────────────────────────────────────────────────────

type SessionOverviewBandProps = {
   assemblyDoc: Record<string, unknown>
   accession: string
   assemblyName: string
   jbrowseAssemblyDisplayName: string
   annotations: GenomeAnnotationRow[]
   chromosomes: ChromosomeRow[]
   selectedChrIds: string[]
   onChrSelect: (chr: ChromosomeRow) => void
   selectedChromosomeSummary: string | null
   sessionsPanelExpanded: boolean
   onToggleSessions: () => void
   detailsPanelOpen: boolean
   onToggleDetails: () => void
}

function SessionOverviewBand({
   assemblyDoc,
   accession,
   assemblyName,
   jbrowseAssemblyDisplayName,
   annotations,
   chromosomes,
   selectedChrIds,
   onChrSelect,
   selectedChromosomeSummary,
   sessionsPanelExpanded,
   onToggleSessions,
   detailsPanelOpen,
   onToggleDetails,
}: SessionOverviewBandProps) {
   const { t } = useLocale()
   const stats = useMemo(() => assemblyFromDoc(assemblyDoc), [assemblyDoc])

   const description =
      typeof assemblyDoc.scientific_name === 'string' ? `${assemblyDoc.scientific_name} (${accession})` : accession
   const metadata = assemblyDoc.metadata
   const refseqCategory =
      metadata != null && typeof metadata === 'object' && !Array.isArray(metadata)
         ? (metadata as Record<string, unknown>).refseq_category
         : undefined
   const isReferenceGenome =
      typeof refseqCategory === 'string' && refseqCategory.toLowerCase() === 'reference genome'

   const statChips = [
      stats.assemblyLevel !== '—' && { label: t('genomeBrowser.statChipLevel'), value: stats.assemblyLevel },
      stats.size !== '—' && { label: t('genomeBrowser.statChipSize'), value: stats.size },
      stats.n50 !== '—' && { label: t('genomeBrowser.statChipN50'), value: stats.n50 },
   ].filter(Boolean) as { label: string; value: string }[]

   return (
      <div className="border-border bg-card shrink-0 space-y-3 border-b px-3 py-3">
         {/* Title row: [sessions toggle] [name+meta] [chips] [details toggle] */}
         <div className="flex items-start gap-2">
            {/* Sessions panel toggle */}
            <Tooltip>
               <TooltipTrigger asChild>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="mt-0.5 h-8 w-8 shrink-0"
                     onClick={onToggleSessions}
                     aria-label={
                        sessionsPanelExpanded
                           ? t('genomeBrowser.hideSessionList')
                           : t('genomeBrowser.showSessionList')
                     }
                  >
                     {sessionsPanelExpanded ? (
                        <ChevronsLeft className="h-4 w-4" />
                     ) : (
                        <ChevronsRight className="h-4 w-4" />
                     )}
                  </Button>
               </TooltipTrigger>
               <TooltipContent side="bottom" className="text-xs">
                  {sessionsPanelExpanded
                     ? t('genomeBrowser.hideSessionList')
                     : t('genomeBrowser.showSessionList')}
               </TooltipContent>
            </Tooltip>

            {/* Assembly name + scientific name + accession */}
            <div className="min-w-0 flex-1 space-y-0.5">
               <div className="flex min-w-0 items-start gap-2">
                  <h2 className="text-foreground min-w-0 flex-1 truncate text-base font-semibold leading-snug sm:text-lg">
                     {assemblyName}
                  </h2>
                  {isReferenceGenome ? (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Badge
                              variant="outline"
                              className="border-accent/40 bg-accent/10 text-accent-foreground h-6 shrink-0 gap-1 px-1.5 py-0 text-[0.65rem] font-medium"
                              aria-label={t('genomeBrowser.referenceGenomeTooltip')}
                           >
                              <Star
                                 className="h-3 w-3 shrink-0 fill-accent text-accent-foreground"
                                 aria-hidden
                              />
                              <span className="max-sm:sr-only">{t('genomeBrowser.referenceGenomeBadge')}</span>
                           </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-xs">
                           {t('genomeBrowser.referenceGenomeTooltip')}
                        </TooltipContent>
                     </Tooltip>
                  ) : null}
               </div>
               <p className="text-muted-foreground font-mono text-[0.65rem] tracking-wide">{description}</p>
            </div>

            {/* Stat chips + details toggle */}
            <div className="flex shrink-0 flex-wrap items-start gap-1.5">
               {statChips.map((chip) => (
                  <div
                     key={chip.label}
                     className="bg-muted/50 border-border flex flex-col rounded-lg border px-2.5 py-1.5 text-center"
                  >
                     <span className="text-foreground text-xs font-semibold tabular-nums leading-none">
                        {chip.value}
                     </span>
                     <span className="text-muted-foreground mt-0.5 text-[0.6rem] font-medium uppercase">
                        {chip.label}
                     </span>
                  </div>
               ))}
               {/* Details panel toggle */}
               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button
                        type="button"
                        variant={detailsPanelOpen ? 'secondary' : 'outline'}
                        size="icon"
                        className="mt-0.5 h-8 w-8 shrink-0"
                        onClick={onToggleDetails}
                        aria-label={
                           detailsPanelOpen
                              ? t('genomeBrowser.closeDetails')
                              : t('genomeBrowser.openDetails')
                        }
                     >
                        {detailsPanelOpen ? (
                           <PanelRightClose className="h-4 w-4" />
                        ) : (
                           <PanelRight className="h-4 w-4" />
                        )}
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                     {detailsPanelOpen
                        ? t('genomeBrowser.closeDetails')
                        : t('genomeBrowser.openDetails')}
                  </TooltipContent>
               </Tooltip>
            </div>
         </div>

         {/* Annotation chips */}
         {annotations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
               {annotations.map((ann) => {
                  const displayName = annotationTrackDisplayName(ann, jbrowseAssemblyDisplayName)
                  const hasGff = !!(ann.gff_gz_location && ann.tab_index_location)
                  return (
                     <Tooltip key={ann.name}>
                        <TooltipTrigger asChild>
                           <Badge
                              variant={hasGff ? 'default' : 'secondary'}
                              className="max-w-[20rem] cursor-default truncate text-xs"
                              title={displayName}
                           >
                              <Layers className="mr-1 h-2.5 w-2.5 shrink-0" aria-hidden />
                              <span className="truncate">{displayName}</span>
                           </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                           <p className="font-medium">{displayName}</p>
                           <p className="text-muted-foreground font-mono">{ann.name}</p>
                           {hasGff ? (
                              <p className="text-primary/80 text-[0.65rem]">
                                 {t('genomeBrowser.trackGffInPortal')}
                              </p>
                           ) : (
                              <p className="text-muted-foreground text-[0.65rem]">
                                 {t('genomeBrowser.trackNoGff')}
                              </p>
                           )}
                        </TooltipContent>
                     </Tooltip>
                  )
               })}
            </div>
         ) : null}

         {/* Chromosome strip */}
         {chromosomes.length > 0 ? (
            <div>
               <div className="mb-1 flex items-center gap-2">
                  <span className="text-muted-foreground text-[0.65rem] font-semibold uppercase tracking-wide">
                     {t('genomeBrowser.chromosomesTitle')}
                  </span>
                  <Badge variant="secondary" className="h-4 font-mono text-[0.6rem]">
                     {chromosomes.length === 1
                        ? `1 ${t('genomeBrowser.sequenceSingular')}`
                        : `${chromosomes.length} ${t('genomeBrowser.sequencePlural')}`}
                  </Badge>
                  {selectedChromosomeSummary ? (
                     <span className="text-muted-foreground ml-auto truncate text-[0.65rem]">
                        ↳ {selectedChromosomeSummary}
                     </span>
                  ) : (
                     <span className="text-muted-foreground ml-auto text-[0.65rem]">
                        {t('genomeBrowser.chromosomeSelectHint')}
                     </span>
                  )}
               </div>
               <ChromosomeOverview
                  chromosomes={chromosomes}
                  selectedAccessionVersions={selectedChrIds}
                  onSelect={onChrSelect}
                  variant="strip"
               />
            </div>
         ) : null}
      </div>
   )
}

// ─────────────────────────────────────────────────────────────────────────────
// SessionDetailsPanel (right panel / Sheet content)
// ─────────────────────────────────────────────────────────────────────────────

type SessionDetailsPanelProps = {
   assemblyDoc?: Record<string, unknown>
   accession?: string
   assemblyName?: string
   annotations: GenomeAnnotationRow[]
   jbrowseAssemblyDisplayName: string
}

function SessionDetailsPanel({
   assemblyDoc,
   accession,
   assemblyName,
   annotations,
   jbrowseAssemblyDisplayName,
}: SessionDetailsPanelProps) {
   const { t } = useLocale()

   if (!assemblyDoc || !accession || !assemblyName) {
      return (
         <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="bg-muted/50 rounded-full p-4">
               <Dna className="h-8 w-8 opacity-40" aria-hidden />
            </div>
            <p className="max-w-[16rem] text-sm leading-relaxed">{t('genomeBrowser.noSessionDetails')}</p>
         </div>
      )
   }

   return (
      <AssemblyAnnotationsDetailsPanel
         assemblyDoc={assemblyDoc}
         accession={accession}
         assemblyName={assemblyName}
         annotations={annotations}
         jbrowseAssemblyDisplayName={jbrowseAssemblyDisplayName}
      />
   )
}

// ─────────────────────────────────────────────────────────────────────────────
// AssemblyAnnotationsDetailsPanel
// ─────────────────────────────────────────────────────────────────────────────

function AssemblyAnnotationsDetailsPanel({
   assemblyDoc,
   accession,
   assemblyName,
   annotations,
   jbrowseAssemblyDisplayName,
}: {
   assemblyDoc: Record<string, unknown>
   accession: string
   assemblyName: string
   annotations: GenomeAnnotationRow[]
   jbrowseAssemblyDisplayName: string
}) {
   const { t } = useLocale()
   const statRows = useMemo(() => assemblyStatsRowsFromDoc(assemblyDoc), [assemblyDoc])
   const description = useMemo(() => assemblyDescriptionFromDoc(assemblyDoc), [assemblyDoc])
   const links = useMemo(() => assemblyExternalLinks(accession, assemblyDoc), [accession, assemblyDoc])

   const scientificName =
      typeof assemblyDoc.scientific_name === 'string' ? assemblyDoc.scientific_name : null

   return (
      <div className="flex flex-col gap-0">
         {/* Panel header */}
         <div className="border-border bg-muted/20 border-b px-4 py-4 space-y-1">
            <h2 className="text-muted-foreground text-[0.65rem] font-semibold uppercase tracking-wide">
               {t('genomeBrowser.sessionDetails')}
            </h2>
            <p className="text-foreground truncate text-sm font-semibold">{assemblyName}</p>
            {scientificName ? (
               <p className="text-muted-foreground text-xs italic">{scientificName}</p>
            ) : null}
            <p className="text-muted-foreground font-mono text-[0.65rem]">{accession}</p>
            {description ? (
               <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
            ) : null}
         </div>

         {/* Stats */}
         {statRows.length > 0 ? (
            <div className="border-border border-b px-4 py-4">
               <h3 className="text-muted-foreground mb-3 text-[0.65rem] font-semibold tracking-wide uppercase">
                  {t('genomeBrowser.assemblyStatistics')}
               </h3>
               <dl className="grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
                  {statRows.map((row) => (
                     <div key={row.label} className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="text-foreground font-medium tabular-nums">{row.value}</dd>
                     </div>
                  ))}
               </dl>
            </div>
         ) : null}

         {/* External links */}
         {links.length > 0 ? (
            <div className="border-border border-b px-4 py-3">
               <div className="flex flex-wrap gap-2">
                  {links.map((l) => (
                     <Button key={l.href} variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
                        <a href={l.href} target="_blank" rel="noopener noreferrer">
                           {l.label}
                           <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                     </Button>
                  ))}
               </div>
            </div>
         ) : null}

         {/* Annotation detail cards */}
         <div className="px-4 py-4">
            <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-[0.65rem] font-semibold tracking-wide uppercase">
               <Layers className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
               {t('genomeBrowser.annotationsSection')}
               {annotations.length > 0 ? (
                  <Badge variant="secondary" className="h-4 font-normal text-[0.6rem]">
                     {annotations.length}
                  </Badge>
               ) : null}
            </h3>
            {annotations.length > 0 ? (
               <div className="flex flex-col gap-4">
                  {annotations.map((ann) => (
                     <AnnotationTrackCard
                        key={ann.name}
                        ann={ann}
                        jbrowseAssemblyDisplayName={jbrowseAssemblyDisplayName}
                     />
                  ))}
               </div>
            ) : (
               <div className="text-muted-foreground flex items-start gap-3 py-4">
                  <Layers className="mt-0.5 h-5 w-5 shrink-0 opacity-40" aria-hidden />
                  <p className="text-sm leading-relaxed">{t('genomeBrowser.noAnnotationsLoaded')}</p>
               </div>
            )}
         </div>
      </div>
   )
}

// ─────────────────────────────────────────────────────────────────────────────
// AnnotationTrackCard
// ─────────────────────────────────────────────────────────────────────────────

function AnnotationTrackCard({
   ann,
   jbrowseAssemblyDisplayName,
}: {
   ann: GenomeAnnotationRow
   jbrowseAssemblyDisplayName: string
}) {
   const { t } = useLocale()
   const overview = annotationOverviewFromRow(ann)
   const meta =
      ann.metadata && typeof ann.metadata === 'object' && !Array.isArray(ann.metadata)
         ? (ann.metadata as Record<string, unknown>)
         : undefined
   const source = sourceFileInfoFromMetadata(meta)
   const indexed = indexedFileInfoFromMetadata(meta)
   const hasGff = !!(ann.gff_gz_location && ann.tab_index_location)

   const displayName = annotationTrackDisplayName(ann, jbrowseAssemblyDisplayName)
   const stableId = annotationStableTrackId(ann)
   const showRawId = displayName !== stableId

   return (
      <Card
         id={`ann-${stableId}`}
         className="border-border/80 shadow-sm transition-shadow hover:shadow-md"
      >
         <CardHeader className="space-y-0 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
               <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-semibold leading-snug">{displayName}</CardTitle>
                  {showRawId ? (
                     <p className="text-muted-foreground mt-0.5 font-mono text-[0.6rem] leading-tight">
                        {t('genomeBrowser.annotationIdLabel')}: {stableId}
                     </p>
                  ) : null}
               </div>
               <Badge variant={hasGff ? 'default' : 'secondary'} className="h-5 shrink-0 text-xs">
                  {hasGff ? t('genomeBrowser.trackGffInPortal') : t('genomeBrowser.trackNoGff')}
               </Badge>
            </div>
         </CardHeader>
         <CardContent className="space-y-3 pt-0">
            {(overview.genesTotal != null ||
               overview.mrnaTotal != null ||
               overview.busco?.complete != null) && (
               <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
                  {overview.genesTotal != null ? (
                     <div className="bg-muted/40 border-border rounded-md border px-2 py-1.5 text-center">
                        <div className="text-foreground text-sm font-semibold tabular-nums">
                           {overview.genesTotal.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[0.6rem] font-medium uppercase">
                           Genes
                        </div>
                     </div>
                  ) : null}
                  {overview.codingGenes != null ? (
                     <div className="bg-muted/40 border-border rounded-md border px-2 py-1.5 text-center">
                        <div className="text-foreground text-sm font-semibold tabular-nums">
                           {overview.codingGenes.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[0.6rem] font-medium uppercase">
                           Coding
                        </div>
                     </div>
                  ) : null}
                  {overview.mrnaTotal != null ? (
                     <div className="bg-muted/40 border-border rounded-md border px-2 py-1.5 text-center">
                        <div className="text-foreground text-sm font-semibold tabular-nums">
                           {overview.mrnaTotal.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[0.6rem] font-medium uppercase">
                           mRNA
                        </div>
                     </div>
                  ) : null}
                  {overview.busco?.complete != null ? (
                     <div className="bg-muted/40 border-border rounded-md border px-2 py-1.5 text-center">
                        <div className="text-foreground text-sm font-semibold tabular-nums">
                           {overview.busco.complete}%
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[0.6rem] font-medium uppercase">
                           BUSCO{overview.busco.lineage ? ` · ${overview.busco.lineage}` : ''}
                        </div>
                     </div>
                  ) : null}
               </div>
            )}

            {overview.busco &&
            (overview.busco.duplicated != null ||
               overview.busco.fragmented != null ||
               overview.busco.missing != null) ? (
               <p className="text-muted-foreground text-[0.65rem] leading-relaxed">
                  BUSCO: duplicated {overview.busco.duplicated ?? '—'}% · fragmented{' '}
                  {overview.busco.fragmented ?? '—'}% · missing {overview.busco.missing ?? '—'}%
                  {overview.busco.total != null ? ` · n=${overview.busco.total}` : ''}
               </p>
            ) : null}

            <div className="text-foreground/90 space-y-1 text-xs leading-relaxed">
               {source.database || source.provider ? (
                  <p>
                     <span className="text-muted-foreground">Source: </span>
                     <span className="font-medium">
                        {[source.database, source.provider].filter(Boolean).join(' · ')}
                     </span>
                  </p>
               ) : null}
               {source.pipelineName ? (
                  <p>
                     <span className="text-muted-foreground">Pipeline: </span>
                     {source.pipelineName}
                     {source.pipelineVersion ? ` (${source.pipelineVersion})` : ''}
                  </p>
               ) : null}
               {(source.releaseDate || source.lastModified) && (
                  <p className="text-muted-foreground">
                     {source.releaseDate ? `Release ${source.releaseDate}` : null}
                     {source.releaseDate && source.lastModified ? ' · ' : null}
                     {source.lastModified ? `Modified ${source.lastModified}` : null}
                  </p>
               )}
               {source.uncompressedMd5 ? (
                  <p className="break-all font-mono text-[10px] text-muted-foreground">
                     Source MD5: {source.uncompressedMd5}
                  </p>
               ) : null}
            </div>

            <div className="border-border flex flex-wrap gap-2 border-t pt-3">
               {ann.gff_gz_location ? (
                  <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
                     <a href={ann.gff_gz_location} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3" />
                       GFF3
                     </a>
                  </Button>
               ) : null}
               {source.urlPath ? (
                  <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 text-xs">
                     <a href={source.urlPath} target="_blank" rel="noopener noreferrer">
                        Source GFF3
                        <ExternalLink className="h-3 w-3" />
                     </a>
                  </Button>
               ) : null}
            </div>

            {indexed.fileSize != null || indexed.processedAt ? (
               <p className="border-border border-t pt-2 text-[10px] leading-relaxed text-muted-foreground">
                  Indexed: {indexed.fileSize != null ? formatFileSize(indexed.fileSize) : ''}
                  {indexed.processedAt ? ` · ${indexed.processedAt}` : ''}
                  {indexed.uncompressedMd5 ? ` · MD5 ${indexed.uncompressedMd5}` : ''}
               </p>
            ) : null}
         </CardContent>
      </Card>
   )
}
