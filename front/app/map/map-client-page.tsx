'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2, MapPin, Search, VectorSquare } from 'lucide-react'

import { MapView } from '@/components/map-view'
import { SpeciesCard } from '@/components/species-card'
import { SpeciesExportSheet } from '@/components/species-export-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
   postLocationsFrequency,
   type GeoJsonGeometry,
   type LocationFrequencyPoint,
   type PostLocationsFrequencyBody,
} from '@/lib/api/coordinates'
import { fetchOrganisms } from '@/lib/api/organisms'
import { useLocale } from '@/contexts/locale-context'

const PAGE_SIZE = 21

/** True only for GeoJSON Polygon / MultiPolygon with coordinates (avoids `{}` matching all samples server-side). */
function isUsableMapPolygon(g: GeoJsonGeometry | null | undefined): g is GeoJsonGeometry {
   if (!g || typeof g !== 'object') return false
   if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') return false
   const c = g.coordinates
   if (!Array.isArray(c) || c.length === 0) return false
   if (g.type === 'Polygon') {
      const ring0 = c[0]
      if (!Array.isArray(ring0) || ring0.length < 3) return false
   }
   return true
}

/** GeoJSON polygon: small box around a frequency point for `polygon` on GET /organisms (geo_within). */
function tinyBoundingPolygon(lng: number, lat: number, delta = 1e-5): GeoJsonGeometry {
   return {
      type: 'Polygon',
      coordinates: [
         [
            [lng - delta, lat - delta],
            [lng + delta, lat - delta],
            [lng + delta, lat + delta],
            [lng - delta, lat + delta],
            [lng - delta, lat - delta],
         ],
      ],
   }
}

function sameSamplePoint(
   a: { lng: number; lat: number },
   b: { lng: number; lat: number },
): boolean {
   return Math.abs(a.lng - b.lng) < 1e-7 && Math.abs(a.lat - b.lat) < 1e-7
}

type IucnFilter = 'all' | 'LC' | 'NT' | 'VU' | 'EN' | 'CR'

function getTaxid(row: Record<string, unknown>): string {
   const t = row.taxid
   return t != null ? String(t) : ''
}

/** Primary map coordinate from organism GeoJSON Point or legacy shape. */
function organismPrimaryCoordinate(row: Record<string, unknown>): { lat: number; lng: number } | null {
   const loc = row.coordinates
   if (!loc || typeof loc !== 'object') return null
   const o = loc as Record<string, unknown>
   const coords = o.coordinates
   if (!Array.isArray(coords) || coords.length < 2) return null
   const a = Number(coords[0])
   const b = Number(coords[1])
   if (!Number.isFinite(a) || !Number.isFinite(b)) return null
   if (o.type === 'Point') return { lng: a, lat: b }
   return { lat: a, lng: b }
}

/**
 * Map marker for this list row: prefer taxid (frequency points include `taxids` from aggregation);
 * fallback to organism `coordinates` vs point with relaxed epsilon.
 */
function frequencyMapPointForOrganism(
   row: Record<string, unknown>,
   points: LocationFrequencyPoint[],
): { lng: number; lat: number } | null {
   const tid = getTaxid(row)
   if (tid) {
      for (const p of points) {
         const ids = p.taxids
         if (ids?.length && ids.some((t) => String(t) === tid)) {
            const [lng, lat] = p.coordinates
            return { lng, lat }
         }
      }
   }
   const oc = organismPrimaryCoordinate(row)
   if (!oc) return null
   const eps = 1e-4
   for (const p of points) {
      const [lng, lat] = p.coordinates
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      if (Math.abs(lng - oc.lng) < eps && Math.abs(lat - oc.lat) < eps) {
         return { lng, lat }
      }
   }
   return null
}

export default function MapClientPage() {
   const { t } = useLocale()
   const searchParams = useSearchParams()
   const taxidFromUrl = searchParams.get('taxid')?.trim() || ''

   const [locations, setLocations] = useState<LocationFrequencyPoint[]>([])
   const [locationsLoading, setLocationsLoading] = useState(true)
   const [locationsError, setLocationsError] = useState<string | null>(null)

   const [activePolygon, setActivePolygon] = useState<GeoJsonGeometry | null>(null)

   const [items, setItems] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [listLoading, setListLoading] = useState(true)
   const [listLoadingMore, setListLoadingMore] = useState(false)
   const [listError, setListError] = useState<string | null>(null)
   const [coordinateFilter, setCoordinateFilter] = useState<{ lng: number; lat: number } | null>(null)
   const [listHoverMapPoint, setListHoverMapPoint] = useState<{ lng: number; lat: number } | null>(null)
   const coordinateFilterRef = useRef(coordinateFilter)
   coordinateFilterRef.current = coordinateFilter
   const itemsRef = useRef(items)
   const totalRef = useRef(total)
   const loadMoreInFlightRef = useRef(false)
   itemsRef.current = items
   totalRef.current = total

   const [selectedLatLng, setSelectedLatLng] = useState<{ lat: number; lng: number } | null>(null)

   const [searchQuery, setSearchQuery] = useState('')
   const [debouncedSearch, setDebouncedSearch] = useState('')
   const [statusFilter, setStatusFilter] = useState<IucnFilter>('all')

   const [exportSheetOpen, setExportSheetOpen] = useState(false)

   useEffect(() => {
      const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
      return () => clearTimeout(t)
   }, [searchQuery])

   const listQueryPolygon = useMemo<GeoJsonGeometry | null>(() => {
      if (coordinateFilter) {
         return tinyBoundingPolygon(coordinateFilter.lng, coordinateFilter.lat)
      }
      if (isUsableMapPolygon(activePolygon)) return activePolygon
      return null
   }, [coordinateFilter, activePolygon])

   const listFiltersKey = useMemo(
      () =>
         JSON.stringify({
            taxid: taxidFromUrl,
            poly: listQueryPolygon,
            search: debouncedSearch,
            iucn: statusFilter,
         }),
      [taxidFromUrl, listQueryPolygon, debouncedSearch, statusFilter],
   )

   useEffect(() => {
      setListHoverMapPoint(null)
   }, [listFiltersKey, locations])

   const buildOrganismListQuery = useCallback(
      (offset: number): Record<string, string | number | undefined> => {
         const q: Record<string, string | number | undefined> = {
            limit: PAGE_SIZE,
            offset,
         }
         if (taxidFromUrl) q.taxon_lineage = taxidFromUrl
         if (listQueryPolygon) q.polygon = JSON.stringify(listQueryPolygon)
         else {
            // No drawn area / marker: only species with ≥1 SampleCoordinates row.
            q.has_sample_locations = 'true'
         }
         if (debouncedSearch) q.filter = debouncedSearch
         if (statusFilter !== 'all') q.iucn_redlist__category = statusFilter
         return q
      },
      [taxidFromUrl, listQueryPolygon, debouncedSearch, statusFilter],
   )

   /** Same filters as the species list + map scope (polygon / sample locations); no pagination — for TSV export sheet. */
   const organismExportParams = useMemo((): Record<string, string | number> => {
      const q: Record<string, string | number> = {
         sort_column: 'scientific_name',
         sort_order: 'asc',
      }
      if (taxidFromUrl) q.taxon_lineage = taxidFromUrl
      if (listQueryPolygon) q.polygon = JSON.stringify(listQueryPolygon)
      else q.has_sample_locations = 'true'
      if (debouncedSearch) q.filter = debouncedSearch
      if (statusFilter !== 'all') q.iucn_redlist__category = statusFilter
      return q
   }, [taxidFromUrl, listQueryPolygon, debouncedSearch, statusFilter])

   /** Same catalog + sample filters as the organism list, for POST /coordinates/frequency. */
   const buildOrganismFrequencyBody = useCallback((): PostLocationsFrequencyBody => {
      const b: PostLocationsFrequencyBody = {}
      if (taxidFromUrl) {
         b.taxon_lineage = taxidFromUrl
         b.taxid = taxidFromUrl
      }
      if (activePolygon) b.polygon = activePolygon
      if (debouncedSearch) b.filter = debouncedSearch
      if (statusFilter !== 'all') b.iucn_redlist__category = statusFilter
      return b
   }, [taxidFromUrl, activePolygon, debouncedSearch, statusFilter])

   const clearSampleLocationFilter = useCallback(() => {
      setCoordinateFilter(null)
      setSelectedLatLng(null)
   }, [])

   const clearMapAreaFilter = useCallback(() => {
      setActivePolygon(null)
   }, [])

   const onMapBackgroundClick = useCallback(() => {
      if (coordinateFilterRef.current != null) {
         setSelectedLatLng(null)
      }
      setCoordinateFilter(null)
   }, [])

   const fetchLocations = useCallback(async () => {
      setLocationsLoading(true)
      setLocationsError(null)
      try {
         const data = await postLocationsFrequency(buildOrganismFrequencyBody())
         setLocations(data)
      } catch (e) {
         setLocations([])
         setLocationsError(e instanceof Error ? e.message : t('map.errors.loadLocations'))
      } finally {
         setLocationsLoading(false)
      }
   }, [buildOrganismFrequencyBody])

   useEffect(() => {
      void fetchLocations()
   }, [fetchLocations])

   useEffect(() => {
      let cancelled = false
      setListLoading(true)
      setListError(null)
      setItems([])
      ;(async () => {
         try {
            const q = buildOrganismListQuery(0)
            const { data, total: t } = await fetchOrganisms(q)
            if (!cancelled) {
               setItems(data)
               setTotal(t)
            }
         } catch (e) {
            if (!cancelled) {
               setItems([])
               setTotal(0)
               setListError(e instanceof Error ? e.message : t('map.errors.loadOrganisms'))
            }
         } finally {
            if (!cancelled) setListLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [listFiltersKey, buildOrganismListQuery])

   const loadMoreOrganisms = useCallback(async () => {
      if (listLoadingMore || listLoading || loadMoreInFlightRef.current) return
      const offset = itemsRef.current.length
      if (offset >= totalRef.current) return
      loadMoreInFlightRef.current = true
      setListLoadingMore(true)
      setListError(null)
      try {
         const q = buildOrganismListQuery(offset)
         const { data, total: t } = await fetchOrganisms(q)
         setTotal(t)
         setItems((prev) => [...prev, ...data])
      } catch (e) {
         setListError(e instanceof Error ? e.message : t('map.errors.loadOrganisms'))
      } finally {
         loadMoreInFlightRef.current = false
         setListLoadingMore(false)
      }
   }, [buildOrganismListQuery, listLoading, listLoadingMore])

   const loadMoreOrganismsRef = useRef(loadMoreOrganisms)
   loadMoreOrganismsRef.current = loadMoreOrganisms

   const listScrollRef = useRef<HTMLDivElement>(null)
   const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
      const root = listScrollRef.current
      const target = loadMoreSentinelRef.current
      if (!root || !target) return

      const obs = new IntersectionObserver(
         (entries) => {
            if (!entries[0]?.isIntersecting) return
            void loadMoreOrganismsRef.current()
         },
         { root, rootMargin: '120px', threshold: 0 },
      )
      obs.observe(target)
      return () => obs.disconnect()
   }, [listFiltersKey, items.length, total])

   const onPolygonChange = useCallback((geometry: GeoJsonGeometry | null) => {
      setActivePolygon(geometry)
      if (geometry) setCoordinateFilter(null)
   }, [])

   const onMapMarkerClick = useCallback((lng: number, lat: number) => {
      const next = { lng, lat }
      const prev = coordinateFilterRef.current
      if (prev != null && sameSamplePoint(prev, next)) {
         setCoordinateFilter(null)
         setSelectedLatLng(null)
         return
      }
      setCoordinateFilter(next)
      setActivePolygon(null)
      setSelectedLatLng({ lat, lng })
   }, [])

   const conservationStatuses: IucnFilter[] = ['LC', 'NT', 'VU', 'EN', 'CR']

   return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
         <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(240px,min(42vh,520px))_minmax(0,1fr)] overflow-hidden basis-0 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
            {/* Map — full height of main row (strip merged into aside header) */}
            <div className="relative flex min-h-0 min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:h-full lg:max-h-full">
               <div className="relative w-full min-h-[240px] flex-1 lg:min-h-0">
                  {locationsError ? (
                     <div className="flex h-full min-h-[240px] items-center justify-center bg-card px-4 text-center text-sm text-destructive">
                        {locationsError}
                     </div>
                  ) : (
                     <MapView
                        points={locations}
                        onPolygonChange={onPolygonChange}
                        activePolygon={activePolygon}
                        selectedLatLng={selectedLatLng}
                        selectedFrequencyPoint={coordinateFilter}
                        hoverFrequencyPoint={listHoverMapPoint}
                        onMarkerClick={onMapMarkerClick}
                        onMapBackgroundClick={onMapBackgroundClick}
                     />
                  )}
                  {locationsLoading ? (
                     <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                     </div>
                  ) : null}
               </div>

               <div className="absolute bottom-4 left-4 z-[1000] max-w-[min(100%,240px)] space-y-2 rounded-lg border border-border bg-card/95 p-3 text-xs backdrop-blur">
                  <div className="font-medium">{t('map.legend.sampleLocations')}</div>
                  <div className="flex items-center gap-2">
                     <span className="h-3 w-3 shrink-0 rounded-full border border-primary/80 bg-primary/45" />
                     <span className="text-muted-foreground">{t('map.legend.locationTooltip')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="h-3 w-3 shrink-0 rounded-full border border-secondary/80 bg-secondary/72" />
                     <span className="text-muted-foreground">{t('map.legend.listHover')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="h-3 w-3 shrink-0 rounded-full border border-accent/90 bg-accent/85" />
                     <span className="text-muted-foreground">{t('map.legend.selectedPoint')}</span>
                  </div>
                  {taxidFromUrl ? (
                     <div className="text-muted-foreground">
                        {t('map.legend.taxonFilter')}: {taxidFromUrl}
                     </div>
                  ) : null}
                  <p className="text-[10px] leading-snug text-muted-foreground">
                     {t('map.legend.clearSampleLocationHint')}
                  </p>
               </div>
            </div>

            <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-t border-border bg-card lg:col-start-2 lg:row-start-1 lg:h-full lg:max-h-full lg:min-h-0 lg:border-l lg:border-t-0">
               <div className="border-border shrink-0 space-y-3 border-b px-4 py-3">
                  {(coordinateFilter || activePolygon) && (
                     <div className="flex flex-col gap-2">
                        {coordinateFilter ? (
                           <div
                              className="flex items-center justify-between gap-2 rounded-lg border border-accent/35 bg-accent/10 px-3 py-2.5 dark:border-accent/25 dark:bg-accent/15"
                              role="status"
                           >
                              <span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-snug">
                                 <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                                 <span>{t('map.filters.sampleLocationActive')}</span>
                              </span>
                              <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 className="h-8 shrink-0 border-border/80 bg-background/80 text-xs"
                                 onClick={clearSampleLocationFilter}
                              >
                                 {t('map.actions.remove')}
                              </Button>
                           </div>
                        ) : null}
                        {activePolygon ? (
                           <div
                              className="flex items-center justify-between gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2.5 dark:border-primary/25 dark:bg-primary/15"
                              role="status"
                           >
                              <span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-snug">
                                 <VectorSquare
                                    className="h-4 w-4 shrink-0 text-primary"
                                    aria-hidden
                                 />
                                 <span>{t('map.filters.drawnAreaActive')}</span>
                              </span>
                              <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 className="h-8 shrink-0 border-border/80 bg-background/80 text-xs"
                                 onClick={clearMapAreaFilter}
                              >
                                 {t('map.actions.remove')}
                              </Button>
                           </div>
                        ) : null}
                     </div>
                  )}

                  {!coordinateFilter && !activePolygon ? (
                     <p className="text-[11px] leading-snug text-muted-foreground">
                        {t('map.hints.useMapToFilter')}
                     </p>
                  ) : null}
               </div>

               <div className="border-border space-y-3 border-b p-4">
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                     <Input
                        placeholder={t('map.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                     />
                  </div>

                  <div className="space-y-2">
                     <div className="text-xs text-muted-foreground">{t('map.iucnLabel')}</div>
                     <div className="flex flex-wrap gap-1.5">
                        <Badge
                           variant={statusFilter === 'all' ? 'default' : 'outline'}
                           className="cursor-pointer"
                           onClick={() => setStatusFilter('all')}
                        >
                           {t('common.all')}
                        </Badge>
                        {conservationStatuses.map((status) => (
                           <Badge
                              key={status}
                              variant={statusFilter === status ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => setStatusFilter(status)}
                           >
                              {status}
                           </Badge>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
                  <div className="border-border shrink-0 border-b px-4 pt-4 pb-3">
                     <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-medium">{t('map.speciesListTitle')}</h3>
                        <Badge variant="secondary">
                           {listLoading ? '…' : total.toLocaleString()}
                        </Badge>
                     </div>
                  </div>

                  <div
                     ref={listScrollRef}
                     className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
                  >
                     {listError ? (
                        <p className="text-destructive text-sm">{listError}</p>
                     ) : listLoading && items.length === 0 ? (
                        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                           <Loader2 className="h-4 w-4 animate-spin" />
                           {t('map.loadingSpecies')}
                        </div>
                     ) : items.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                           {t('map.emptyFiltered')}
                        </p>
                     ) : (
                        <>
                           <div className="space-y-3">
                              {items.map((row) => {
                                 const tid = getTaxid(row)
                                 return (
                                    <div
                                       key={tid || JSON.stringify(row)}
                                       onMouseEnter={() => {
                                          setListHoverMapPoint(frequencyMapPointForOrganism(row, locations))
                                       }}
                                       onMouseLeave={() => setListHoverMapPoint(null)}
                                    >
                                       <SpeciesCard organism={row} compact compactVariant="comfortable" />
                                    </div>
                                 )
                              })}
                           </div>
                           {items.length < total ? (
                              <div
                                 ref={loadMoreSentinelRef}
                                 className="flex min-h-10 w-full flex-col items-center justify-center py-2"
                                 aria-hidden
                              >
                                 {listLoadingMore ? (
                                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                                 ) : (
                                    <span className="text-muted-foreground/70 text-[10px]">
                                       {t('common.scrollForMore')}
                                    </span>
                                 )}
                              </div>
                           ) : null}
                        </>
                     )}
                  </div>

                  <div className="border-border bg-card shrink-0 space-y-1 border-t px-4 py-3">
                     <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full gap-2"
                        disabled={listLoading}
                        onClick={() => setExportSheetOpen(true)}
                     >
                        <Download className="h-4 w-4" />
                        {t('common.exportTsv')}
                     </Button>
                     {items.length > 0 && total > 0 ? (
                        <p className="text-muted-foreground text-center text-[10px]">
                           {t('common.showing')} {items.length.toLocaleString()} {t('common.of')}{' '}
                           {total.toLocaleString()}
                           {items.length < total ? ` · ${t('common.scrollToLoadMore')}` : null}
                        </p>
                     ) : null}
                  </div>
               </div>
            </aside>
         </div>

         <SpeciesExportSheet
            open={exportSheetOpen}
            onOpenChange={setExportSheetOpen}
            exportParams={organismExportParams}
            totalCount={total}
         />
      </div>
   )
}
