import { getNestedValue } from '@/lib/catalogQueryParams'

/**
 * JBrowse sessions expect chromosome-level structure; matches common NCBI
 * `metadata.assembly_info.assembly_level` values.
 */
export function assemblyLevelSupportsGenomeBrowser(assemblyLevel: unknown): boolean {
   const s = String(assemblyLevel ?? '').trim().toLowerCase()
   if (!s) return false
   if (/\bcomplete\s+genome\b/.test(s) || s === 'complete_genome') return true
   if (/\bchromosome(?:\s+level)?\b/.test(s) || s === 'chromosome_level') return true
   return false
}

export function assemblyBrowserAssemblyLevelFromRow(row: Record<string, unknown>): unknown {
   return getNestedValue(row, 'metadata.assembly_info.assembly_level')
}
