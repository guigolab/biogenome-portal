'use client'

import type { MutableRefObject } from 'react'
import { useEffect } from 'react'

import { fetchOrganisms } from '@/lib/api/organisms'
import { fetchFieldStats } from '@/lib/api/stats'
import type { SpeciesListFacetDef } from '@/lib/portal/types'
import { SPECIES_DATA_FILTER_CODES } from '@/lib/speciesDataFilter'
import type { OrganismStatsQueryContext } from '@/lib/speciesListOrganismStatsQuery'
import {
   buildOrganismStatsQuery,
   organismStatsCacheKey,
} from '@/lib/speciesListOrganismStatsQuery'
import {
   parseSpeciesListFacetSectionId,
   speciesListFacetStatsField,
} from '@/lib/speciesListFacets'
import { useOrganismCountriesDisplayStore } from '@/stores/organism-countries-display-store'
import {
   COUNTRIES_SECTION_ID,
   DATA_SECTION_ID,
   GOAT_STATUS_SECTION_ID,
   IUCN_SECTION_ID,
   SUB_PROJECT_SECTION_ID,
   TAXONOMY_SECTION_ID,
   useSpeciesListFilterAccordion,
} from '@/components/species-list/species-list-filter-accordion-context'

const IUCN_STATS_FIELD = 'iucn_redlist.category'
const SUB_PROJECT_STATS_FIELD = 'sub_project'
const COUNTRIES_STATS_FIELD = 'countries'
const GOAT_STATS_FIELD = 'goat_status'
const INSDC_COUNTS_STATS_FIELD = 'insdc_counts_any'

type CacheRef = MutableRefObject<Map<string, Record<string, number>>>

function runCachedFetch(
   cache: CacheRef,
   model: string,
   field: string,
   q: Record<string, string>,
   apply: (raw: Record<string, number>) => void,
): void {
   const key = organismStatsCacheKey(model, field, q)
   const hit = cache.current.get(key)
   if (hit) {
      apply(hit)
      return
   }
   void fetchFieldStats(model, field, q)
      .then((raw) => {
         cache.current.set(key, raw)
         apply(raw)
      })
      .catch(() => {
         cache.current.set(key, {})
         apply({})
      })
}

function fetchCountryFacetIntoStore(
   cache: CacheRef,
   statsQueryBase: OrganismStatsQueryContext,
   cancelled: () => boolean,
): void {
   const q = buildOrganismStatsQuery(statsQueryBase, 'countries')
   const key = organismStatsCacheKey('organisms', COUNTRIES_STATS_FIELD, q)
   const setStore = useOrganismCountriesDisplayStore.getState().setCountryDisplayStats
   const hit = cache.current.get(key)
   if (hit) {
      if (!cancelled()) setStore(hit, { loading: false })
      return
   }
   const prev = useOrganismCountriesDisplayStore.getState().countryFrequencyStats
   if (!cancelled()) setStore(prev, { loading: true })
   void fetchFieldStats('organisms', COUNTRIES_STATS_FIELD, q)
      .then((raw) => {
         if (cancelled()) return
         cache.current.set(key, raw)
         setStore(raw, { loading: false })
      })
      .catch(() => {
         if (cancelled()) return
         cache.current.set(key, {})
         setStore({}, { loading: false })
      })
}

function fetchInsdcCountTotals(
   cache: CacheRef,
   statsQueryBase: OrganismStatsQueryContext,
   setInsdcCountStats: (v: Record<string, number>) => void,
   setInsdcCountStatsLoading: (v: boolean) => void,
   cancelled: () => boolean,
): void {
   const base = buildOrganismStatsQuery(statsQueryBase, 'insdc_counts')
   const cacheKey = organismStatsCacheKey('organisms', INSDC_COUNTS_STATS_FIELD, base)
   const hit = cache.current.get(cacheKey)
   if (hit) {
      if (!cancelled()) {
         setInsdcCountStats(hit)
         setInsdcCountStatsLoading(false)
      }
      return
   }

   if (!cancelled()) setInsdcCountStatsLoading(true)

   void Promise.all(
      SPECIES_DATA_FILTER_CODES.map(async (code) => {
         const res = await fetchOrganisms({
            ...base,
            insdc_counts_any: code,
            limit: 1,
            offset: 0,
         })
         return [code, res.total] as const
      }),
   )
      .then((pairs) => {
         if (cancelled()) return
         const raw = Object.fromEntries(pairs) as Record<string, number>
         cache.current.set(cacheKey, raw)
         setInsdcCountStats(raw)
         setInsdcCountStatsLoading(false)
      })
      .catch(() => {
         if (cancelled()) return
         const empty = Object.fromEntries(SPECIES_DATA_FILTER_CODES.map((c) => [c, 0]))
         cache.current.set(cacheKey, empty)
         setInsdcCountStats(empty)
         setInsdcCountStatsLoading(false)
      })
}

/**
 * Catalog-sidebar pattern: refresh organism facet `/stats` only for the accordion section that is
 * open. Country stats are fetched lazily — only when the countries panel is opened — matching the
 * behaviour of all other filter sections. When `showCountries` is false no country fetches run.
 * Data (insdc) option totals use GET /organisms?limit=1 per code.
 * Portal-declared metadata facets use `/stats/organisms/metadata.<key>`.
 */
export function SpeciesListFacetStatsSync({
   statsQueryBase,
   goatEnabled,
   showCountries,
   organismStatsCacheRef,
   setIucnThreatStats,
   setSubProjectStats,
   setGoatStats,
   setInsdcCountStats,
   setInsdcCountStatsLoading,
   speciesListFacets,
   setFacetStats,
}: {
   statsQueryBase: OrganismStatsQueryContext
   goatEnabled: boolean
   showCountries: boolean
   organismStatsCacheRef: CacheRef
   setIucnThreatStats: (v: Record<string, number>) => void
   setSubProjectStats: (v: Record<string, number>) => void
   setGoatStats: (v: Record<string, number>) => void
   setInsdcCountStats: (v: Record<string, number>) => void
   setInsdcCountStatsLoading: (v: boolean) => void
   speciesListFacets: SpeciesListFacetDef[]
   setFacetStats: (key: string, stats: Record<string, number>) => void
}) {
   const { openSection } = useSpeciesListFilterAccordion()

   useEffect(() => {
      if (!openSection || openSection === TAXONOMY_SECTION_ID) return

      if (openSection === DATA_SECTION_ID) {
         let cancelled = false
         fetchInsdcCountTotals(
            organismStatsCacheRef,
            statsQueryBase,
            setInsdcCountStats,
            setInsdcCountStatsLoading,
            () => cancelled,
         )
         return () => {
            cancelled = true
         }
      }

      if (showCountries && openSection === COUNTRIES_SECTION_ID) {
         let cancelled = false
         fetchCountryFacetIntoStore(organismStatsCacheRef, statsQueryBase, () => cancelled)
         return () => {
            cancelled = true
         }
      }

      if (openSection === IUCN_SECTION_ID) {
         const q = buildOrganismStatsQuery(statsQueryBase, 'iucn')
         runCachedFetch(organismStatsCacheRef, 'organisms', IUCN_STATS_FIELD, q, setIucnThreatStats)
         return
      }
      if (openSection === SUB_PROJECT_SECTION_ID) {
         const q = buildOrganismStatsQuery(statsQueryBase, 'sub_project')
         runCachedFetch(
            organismStatsCacheRef,
            'organisms',
            SUB_PROJECT_STATS_FIELD,
            q,
            setSubProjectStats,
         )
         return
      }
      const facetKey = parseSpeciesListFacetSectionId(openSection)
      if (facetKey && speciesListFacets.some((f) => f.key === facetKey)) {
         const statsField = speciesListFacetStatsField(facetKey)
         const q = buildOrganismStatsQuery(statsQueryBase, statsField)
         runCachedFetch(organismStatsCacheRef, 'organisms', statsField, q, (raw) =>
            setFacetStats(facetKey, raw),
         )
         return
      }
      if (!goatEnabled) return
      if (openSection === GOAT_STATUS_SECTION_ID) {
         const q = buildOrganismStatsQuery(statsQueryBase, 'goat_status')
         runCachedFetch(organismStatsCacheRef, 'organisms', GOAT_STATS_FIELD, q, setGoatStats)
      }
   }, [
      openSection,
      statsQueryBase,
      showCountries,
      goatEnabled,
      organismStatsCacheRef,
      setIucnThreatStats,
      setSubProjectStats,
      setGoatStats,
      setInsdcCountStats,
      setInsdcCountStatsLoading,
      speciesListFacets,
      setFacetStats,
   ])

   return null
}
