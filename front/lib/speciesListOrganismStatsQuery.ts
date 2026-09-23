import { speciesMetadataBucketToQueryValue } from '@/lib/speciesFieldStats'
import type { SpeciesListFacetDef } from '@/lib/portal/types'
import type { SpeciesDataFilterCode } from '@/lib/speciesDataFilter'
import { appendSpeciesListFacetDimensions } from '@/lib/speciesListFacets'

/** Context for organism field stats — same dimensions as the species list + GoaT (when enabled). */
export type OrganismStatsQueryContext = {
   taxon_lineage?: string | null
   /** Comma-separated OR of lineage-contains (`taxon_lineage__in`). */
   taxon_lineage__in?: string | null
   /** Comma-separated lineage-not-contains (`taxon_lineage__nin`). */
   taxon_lineage__nin?: string | null
   filter?: string
   iucnThreatFilter: string
   subProjectFilter: string
   selectedCountryCodes: string[]
   /** Declared portal.json `speciesListFacets` (public list metadata filters). */
   speciesListFacets: SpeciesListFacetDef[]
   /** Selected values per facet key (multi: many; single: 0–1, never `'all'`). */
   facetSelections: Record<string, string[]>
   /** Stored `goat_status` API values; omit from query when aggregating `goat_status`. */
   goatStatusFilters: string[]
   /** `'all'` or one `target_list_status` value. */
   targetListFilter: string
   /** `insdc_counts_any` codes; omit when aggregating `insdc_counts`. */
   insdcCountFilters: SpeciesDataFilterCode[]
}

export type OrganismStatsFacet =
   | 'iucn'
   | 'sub_project'
   | 'countries'
   | 'goat_status'
   | 'target_list_status'
   | 'insdc_counts'

function appendGoatDimensions(
   q: Record<string, string>,
   ctx: OrganismStatsQueryContext,
   facet: string,
): void {
   if (facet !== 'goat_status' && ctx.goatStatusFilters.length > 0) {
      q.goat_status__in = [...ctx.goatStatusFilters].sort().join(',')
   }
}

function appendInsdcCountDimensions(
   q: Record<string, string>,
   ctx: OrganismStatsQueryContext,
   facet: string,
): void {
   if (facet !== 'insdc_counts' && ctx.insdcCountFilters.length > 0) {
      q.insdc_counts_any = [...ctx.insdcCountFilters].sort().join(',')
   }
}

/**
 * Query params for GET /stats/organisms/:field — mirrors list filters but omits the facet
 * being aggregated so bucket counts stay meaningful.
 * For metadata facets pass the full stats path (e.g. `metadata.sequencing_type`) as `facet`.
 */
export function buildOrganismStatsQuery(
   ctx: OrganismStatsQueryContext,
   facet: OrganismStatsFacet | string,
): Record<string, string> {
   const q: Record<string, string> = {}
   if (ctx.taxon_lineage) q.taxon_lineage = ctx.taxon_lineage
   if (ctx.taxon_lineage__in) q.taxon_lineage__in = ctx.taxon_lineage__in
   if (ctx.taxon_lineage__nin) q.taxon_lineage__nin = ctx.taxon_lineage__nin
   if (ctx.filter?.trim()) q.filter = ctx.filter.trim()

   if (facet !== 'iucn' && ctx.iucnThreatFilter !== 'all') {
      q.iucn_redlist__category = ctx.iucnThreatFilter
   }
   if (facet !== 'sub_project' && ctx.subProjectFilter !== 'all') {
      q.sub_project = speciesMetadataBucketToQueryValue(ctx.subProjectFilter)
   }
   if (facet !== 'countries' && ctx.selectedCountryCodes.length > 0) {
      q.countries__in = [...ctx.selectedCountryCodes].sort().join(',')
   }
   appendGoatDimensions(q, ctx, facet)
   appendInsdcCountDimensions(q, ctx, facet)
   const exclude =
      typeof facet === 'string' && facet.startsWith('metadata.') ? facet : undefined
   appendSpeciesListFacetDimensions(q, ctx.speciesListFacets, ctx.facetSelections, exclude)
   return q
}

export function organismStatsCacheKey(model: string, field: string, query: Record<string, string>): string {
   const keys = Object.keys(query).sort()
   const serialized = keys.map((k) => `${k}=${query[k] ?? ''}`).join('&')
   return `${model}:${field}:${serialized}`
}
