/**
 * Tree table row shape from GET /tree (see server ROOT_TREE_FIELDS).
 */
export type TreeTableRow = {
   taxid: string
   parent_taxid: string | null
   name: string
   rank: string
   organisms_count: number
   assemblies_count: number
   reads_count: number
   biosamples_count: number
   local_samples_count: number
   genome_annotations_count: number
}

/** Node data for d3.hierarchy / radial tree (id matches legacy d3-radial-tree). */
export type FlatTreeNode = {
   id: string
   scientific_name: string
   rank: string
   organisms_count: number
   assemblies_count: number
   reads_count: number
   biosamples_count: number
   local_samples_count: number
   /** Alias used by tooltips / older code paths */
   annotations_count: number
   coding_count?: number
   non_coding_count?: number
   pseudogene_count?: number
   mrna_count?: number
   lncrna_count?: number
   trna_count?: number
   mirna_count?: number
   busco_single_copy_mean?: number
   busco_duplicated_mean?: number
   busco_fragmented_mean?: number
   busco_missing_mean?: number
   /** Nested children for building hierarchy input */
   children?: FlatTreeNode[]
}

export function rowToFlatTreeNode(row: TreeTableRow): FlatTreeNode {
   return {
      id: row.taxid,
      scientific_name: row.name || row.taxid,
      rank: row.rank,
      organisms_count: row.organisms_count,
      assemblies_count: row.assemblies_count,
      reads_count: row.reads_count,
      biosamples_count: row.biosamples_count,
      local_samples_count: row.local_samples_count,
      annotations_count: row.genome_annotations_count,
   }
}

export function parseTreeRow(fields: string[], row: (string | number | null)[]): TreeTableRow | null {
   const idx = Object.fromEntries(fields.map((f, i) => [f, i])) as Record<string, number>
   const taxid = String(row[idx.taxid] ?? '').trim()
   if (!taxid) return null
   const num = (key: string) => {
      const v = row[idx[key]]
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : 0
   }
   const parentRaw = row[idx.parent_taxid]
   const parent_taxid =
      parentRaw != null && String(parentRaw).trim() !== '' ? String(parentRaw).trim() : null
   return {
      taxid,
      parent_taxid,
      name: String(row[idx.name] ?? ''),
      rank: String(row[idx.rank] ?? ''),
      organisms_count: num('organisms_count'),
      assemblies_count: num('assemblies_count'),
      reads_count: num('reads_count'),
      biosamples_count: num('biosamples_count'),
      local_samples_count: num('local_samples_count'),
      genome_annotations_count: num('genome_annotations_count'),
   }
}
