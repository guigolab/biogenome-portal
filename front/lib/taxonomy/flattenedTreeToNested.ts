import { getRootTaxid } from '@/lib/api/taxon'

export type FlattenedTreeResponse = {
   fields: string[]
   rows: (string | number | null)[][]
}

export type NestedTaxonNode = {
   taxid: string
   name: string
   rank: string
   /** Species / organism count (from `leaves` column if present, else `organisms_count`). */
   leaves: number
   children?: NestedTaxonNode[]
}

export function flattenedTreeToNested(
   response: FlattenedTreeResponse,
   preferredRootTaxid?: string | null,
): { tree: NestedTaxonNode; rootNode: NestedTaxonNode } {
   const { fields, rows } = response
   const idx = Object.fromEntries(fields.map((f, i) => [f, i])) as Record<string, number>
   const byTaxid = new Map<string, NestedTaxonNode>()

   const leavesIdx = idx.leaves
   const orgIdx = idx.organisms_count

   for (const row of rows) {
      const taxid = String(row[idx.taxid] ?? '').trim()
      if (!taxid) continue
      const name = String(row[idx.name] ?? '')
      const rank = String(row[idx.rank] ?? '')
      let leaves = 0
      if (leavesIdx !== undefined) {
         const v = row[leavesIdx]
         leaves = Number(v ?? 0)
      }
      if (!Number.isFinite(leaves) || leaves === 0) {
         const v = orgIdx !== undefined ? row[orgIdx] : undefined
         leaves = Number(v ?? 0)
      }
      if (!Number.isFinite(leaves)) leaves = 0
      byTaxid.set(taxid, { taxid, name, rank, leaves, children: [] })
   }

   const roots: NestedTaxonNode[] = []
   for (const row of rows) {
      const taxid = String(row[idx.taxid] ?? '').trim()
      if (!taxid) continue
      const parentTaxid = row[idx.parent_taxid]
      const parentKey = parentTaxid != null && String(parentTaxid).trim() !== '' ? String(parentTaxid).trim() : null
      const node = byTaxid.get(taxid)
      if (!node) continue

      if (!parentKey || !byTaxid.has(parentKey)) {
         roots.push(node)
      } else {
         const parent = byTaxid.get(parentKey)
         if (parent?.children) parent.children.push(node)
      }
   }

   if (roots.length === 0) {
      const empty: NestedTaxonNode = { taxid: '', name: '', rank: '', leaves: 0, children: [] }
      return { tree: empty, rootNode: empty }
   }

   const preferred =
      (preferredRootTaxid?.trim() ? roots.find((r) => r.taxid === preferredRootTaxid.trim()) : null) ??
      roots.find((r) => r.taxid === getRootTaxid()) ??
      roots[0]

   const rootNode = preferred
   if (roots.length === 1) {
      return { tree: roots[0], rootNode }
   }
   const virtualRoot: NestedTaxonNode = {
      taxid: '',
      name: 'root',
      rank: '',
      leaves: roots.reduce((s, r) => s + r.leaves, 0),
      children: roots,
   }
   return { tree: virtualRoot, rootNode }
}
