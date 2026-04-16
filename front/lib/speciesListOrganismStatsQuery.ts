import { speciesMetadataBucketToQueryValue } from '@/lib/speciesFieldStats'

/** Context for organism field stats — same dimensions as the species list + GoaT (when enabled). */
export type OrganismStatsQueryContext = {
   taxon_lineage?: string | null
   filter?: string
   iucnThreatFilter: string
   subProjectFilter: string
   sequencingTypeFilter: string
   selectedCountryCodes: string[]
   /** Stored `goat_status` API values; omit from query when aggregating `goat_status`. */
   goatStatusFilters: string[]
   /** `'all'` or one `target_list_status` value. */
   targetListFilter: string
}

export type OrganismStatsFacet =
   | 'iucn'
   | 'sub_project'
   | 'sequencing_type'
   | 'countries'
   | 'goat_status'
   | 'target_list_status'

function appendGoatDimensions(
   q: Record<string, string>,
   ctx: OrganismStatsQueryContext,
   facet: OrganismStatsFacet,
): void {
   if (facet !== 'goat_status' && ctx.goatStatusFilters.length > 0) {
      q.goat_status__in = [...ctx.goatStatusFilters].sort().join(',')
   }
   if (facet !== 'target_list_status' && ctx.targetListFilter !== 'all') {
      q.target_list_status__in = ctx.targetListFilter
   }
}

/**
 * Query params for GET /stats/organisms/:field — mirrors list filters but omits the facet
 * being aggregated so bucket counts stay meaningful.
 */
export function buildOrganismStatsQuery(
   ctx: OrganismStatsQueryContext,
   facet: OrganismStatsFacet,
): Record<string, string> {
   const q: Record<string, string> = {}
   if (ctx.taxon_lineage) q.taxon_lineage = ctx.taxon_lineage
   if (ctx.filter?.trim()) q.filter = ctx.filter.trim()

   if (facet !== 'iucn' && ctx.iucnThreatFilter !== 'all') {
      q.iucn_redlist__category = ctx.iucnThreatFilter
   }
   if (facet !== 'sub_project' && ctx.subProjectFilter !== 'all') {
      q.sub_project = speciesMetadataBucketToQueryValue(ctx.subProjectFilter)
   }
   if (facet !== 'sequencing_type' && ctx.sequencingTypeFilter !== 'all') {
      q.sequencing_type = speciesMetadataBucketToQueryValue(ctx.sequencingTypeFilter)
   }
   if (facet !== 'countries' && ctx.selectedCountryCodes.length > 0) {
      q.countries__in = [...ctx.selectedCountryCodes].sort().join(',')
   }
   appendGoatDimensions(q, ctx, facet)
   return q
}

export function organismStatsCacheKey(model: string, field: string, query: Record<string, string>): string {
   const keys = Object.keys(query).sort()
   const serialized = keys.map((k) => `${k}=${query[k] ?? ''}`).join('&')
   return `${model}:${field}:${serialized}`
}
