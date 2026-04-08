import type { GenomeAnnotationRow } from '@/lib/api/assemblies'
import { sourceFileInfoFromMetadata } from '@/lib/genome-browser/annotationBrowserDetails'

/**
 * Stable JBrowse trackId / config key — equals `ann.name.trim()` (unchanged from previous behaviour).
 * Use this anywhere a persistent identifier is required (defaultSession config keys, display ids).
 */
export function annotationStableTrackId(ann: GenomeAnnotationRow): string {
   return ann.name.trim()
}

/**
 * Human-readable display label for the annotation track, derived from:
 *   1. `{assemblyDisplayName} · {provider}` — when provider/database metadata is available.
 *   2. `{assemblyDisplayName}` — when only the assembly name is available.
 *   3. `metadata.annotation_id` — if present and steps 1-2 yield nothing useful.
 *   4. `ann.name` — last resort fallback (the raw catalog id).
 *
 * @param ann                - annotation row from the API.
 * @param assemblyDisplayName - human-readable assembly name (e.g. `jbrowseAssemblyDisplayName`).
 */
export function annotationTrackDisplayName(
   ann: GenomeAnnotationRow,
   assemblyDisplayName: string,
): string {
   const meta =
      ann.metadata && typeof ann.metadata === 'object' && !Array.isArray(ann.metadata)
         ? (ann.metadata as Record<string, unknown>)
         : undefined

   const source = sourceFileInfoFromMetadata(meta)
   const qualifier = source.provider || source.database

   const base = assemblyDisplayName.trim() || ann.assembly_name?.trim() || ''

   if (base && qualifier) return `${base} · ${qualifier}`
   if (base) return base

   const annId = meta?.annotation_id
   if (typeof annId === 'string' && annId.trim()) return annId.trim()

   return ann.name
}
