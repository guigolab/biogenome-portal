import { dataModels, type DataModels } from '@/lib/portal/types'
import { taxonNodeToPortalStats } from '@/lib/portal/taxonNodeStats'

/** Portal models minus organisms (species has its own page). */
export function catalogModelKeysExcludingOrganisms(
   models: Partial<Record<DataModels, unknown>> | undefined,
): DataModels[] {
   if (!models) return []
   return dataModels.filter((k) => k !== 'organisms' && models[k] != null)
}

export function defaultSortColumn(columns: string[] | undefined): string {
   if (!columns?.length) return 'taxid'
   const c = columns[0]
   return c && c.trim() ? c : 'taxid'
}

/** Preferred `sort_column` when present in the resolved column list (after `ensureTaxonColumns`). */
const PREFERRED_SORT: Partial<Record<DataModels, string>> = {
   assemblies: 'accession',
   biosamples: 'accession',
   reads: 'run_accession',
   annotations: 'name',
   local_samples: 'local_id',
}

export function defaultSortColumnForCatalog(catalogKey: DataModels, columns: string[]): string {
   const pref = PREFERRED_SORT[catalogKey]
   if (pref && columns.includes(pref)) return pref
   return defaultSortColumn(columns)
}

/** Effective catalog model from local selected key + visible keys + portal models. */
export function resolveCatalogKey(
   selectedCatalog: DataModels | null,
   visibleCatalogKeys: DataModels[],
   allModelKeys: DataModels[],
): DataModels {
   if (selectedCatalog && allModelKeys.includes(selectedCatalog)) {
      if (visibleCatalogKeys.length && !visibleCatalogKeys.includes(selectedCatalog)) {
         return visibleCatalogKeys[0] ?? allModelKeys[0] ?? 'assemblies'
      }
      return selectedCatalog
   }
   return visibleCatalogKeys[0] ?? allModelKeys[0] ?? 'assemblies'
}

export function deriveVisibleCatalogKeys(
   countsReady: boolean,
   taxonForCounts: Record<string, unknown> | null,
   allModelKeys: DataModels[],
): DataModels[] {
   if (!countsReady || !taxonForCounts) return []
   const stats = taxonNodeToPortalStats(taxonForCounts)
   const byKey = Object.fromEntries(stats.map((s) => [s.key, s.count]))
   const withData = allModelKeys.filter((k) => (byKey[k] ?? 0) > 0)
   return withData.length > 0 ? withData : []
}

export function deriveCanFetchList(
   taxonLoadError: string | null,
   catalogKey: DataModels,
   allModelKeys: DataModels[],
   countsReady: boolean,
   visibleCatalogKeys: DataModels[],
): boolean {
   return (
      !taxonLoadError &&
      allModelKeys.includes(catalogKey) &&
      (!countsReady || (visibleCatalogKeys.length > 0 && visibleCatalogKeys.includes(catalogKey)))
   )
}
