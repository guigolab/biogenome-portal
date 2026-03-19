import * as d3 from 'd3'

type AnyTaxonNode = Record<string, any> & {
   taxid?: string
   children?: AnyTaxonNode[]
}

export type TaxonomyTreeIndex = {
   root: AnyTaxonNode
   byTaxid: Map<string, AnyTaxonNode>
   childrenByTaxid: Map<string, AnyTaxonNode[]>
   parentByTaxid: Map<string, string>
}

export function createTaxonomyTreeIndex(treeData: Record<string, any> | null | undefined): TaxonomyTreeIndex | null {
   if (!treeData || typeof treeData !== 'object') return null

   const root = treeData as AnyTaxonNode
   const byTaxid = new Map<string, AnyTaxonNode>()
   const childrenByTaxid = new Map<string, AnyTaxonNode[]>()
   const parentByTaxid = new Map<string, string>()

   const hierarchy = d3.hierarchy(root, (d: AnyTaxonNode) => d.children || [])
   hierarchy.each((node) => {
      const taxid = String(node.data?.taxid ?? '')
      if (!taxid) return
      byTaxid.set(taxid, node.data)
      if (node.parent?.data?.taxid) {
         parentByTaxid.set(taxid, String(node.parent.data.taxid))
      }
      const children = (node.children || []).map((c) => c.data).filter((c) => !!c?.taxid)
      childrenByTaxid.set(taxid, children)
   })

   return { root, byTaxid, childrenByTaxid, parentByTaxid }
}

export function getTaxonChildren(index: TaxonomyTreeIndex | null, taxid: string): AnyTaxonNode[] {
   if (!index || !taxid) return []
   return index.childrenByTaxid.get(taxid) || []
}

export function hasTaxonChildren(index: TaxonomyTreeIndex | null, taxid: string): boolean {
   return getTaxonChildren(index, taxid).length > 0
}

export function getTaxonAncestors(index: TaxonomyTreeIndex | null, taxid: string): string[] {
   if (!index || !taxid) return []
   const chain: string[] = []
   let cursor = taxid
   while (index.parentByTaxid.has(cursor)) {
      const parent = index.parentByTaxid.get(cursor)
      if (!parent) break
      chain.push(parent)
      cursor = parent
   }
   chain.reverse()
   return chain
}
