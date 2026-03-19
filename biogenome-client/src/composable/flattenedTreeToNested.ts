/**
 * Converts flattened taxonomy tree (fields + rows) to nested format
 * expected by d3.hierarchy, createTaxonomyTreeIndex, etc.
 */
export type FlattenedTreeResponse = {
   fields: string[]
   rows: (string | number | null)[][]
}

export type NestedTaxonNode = {
   taxid: string
   name: string
   rank: string
   leaves: number
   children?: NestedTaxonNode[]
}

export function flattenedTreeToNested(
   response: FlattenedTreeResponse,
): { tree: NestedTaxonNode; rootNode: NestedTaxonNode } {
   const { fields, rows } = response
   const idx = Object.fromEntries(fields.map((f, i) => [f, i])) as Record<string, number>
   const byTaxid = new Map<string, NestedTaxonNode>()

   for (const row of rows) {
      const taxid = String(row[idx.taxid] ?? '')
      const name = String(row[idx.name] ?? '')
      const rank = String(row[idx.rank] ?? '')
      const leaves = Number(row[idx.leaves] ?? 0)
      byTaxid.set(taxid, { taxid, name, rank, leaves, children: [] })
   }

   const roots: NestedTaxonNode[] = []
   for (const row of rows) {
      const taxid = String(row[idx.taxid] ?? '')
      const parentTaxid = row[idx.parent_taxid]
      const parentKey = parentTaxid != null && parentTaxid !== '' ? String(parentTaxid) : null
      const node = byTaxid.get(taxid)
      if (!node) continue

      if (!parentKey || !byTaxid.has(parentKey)) {
         roots.push(node)
      } else {
         const parent = byTaxid.get(parentKey)
         if (parent && parent.children) parent.children.push(node)
      }
   }

   if (roots.length === 0) {
      const empty: NestedTaxonNode = { taxid: '', name: '', rank: '', leaves: 0, children: [] }
      return { tree: empty, rootNode: empty }
   }
   const preferredRootTaxid =
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_ROOT_NODE
         ? String(import.meta.env.VITE_ROOT_NODE)
         : null
   const preferredRoot = preferredRootTaxid ? roots.find((r) => r.taxid === preferredRootTaxid) : null
   const rootNode = preferredRoot ?? roots[0]
   if (roots.length === 1) {
      return { tree: roots[0], rootNode: roots[0] }
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
