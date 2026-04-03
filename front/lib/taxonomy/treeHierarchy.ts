import * as d3 from 'd3'

import type { FlatTreeNode } from '@/lib/taxonomy/treeTableTypes'
import type { NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'

function syntheticFlat(n: NestedTaxonNode): FlatTreeNode {
   return {
      id: n.taxid,
      scientific_name: n.name || n.taxid || 'root',
      rank: n.rank,
      organisms_count: n.leaves,
      assemblies_count: 0,
      reads_count: 0,
      biosamples_count: 0,
      local_samples_count: 0,
      annotations_count: 0,
   }
}

/** Build a FlatTreeNode tree from nested structure + row map (for d3.hierarchy). */
export function nestedToFlatTree(
   n: NestedTaxonNode,
   byTaxid: Map<string, FlatTreeNode>,
): FlatTreeNode {
   const flat = n.taxid ? byTaxid.get(n.taxid) : undefined
   const base = flat ?? syntheticFlat(n)
   if (!n.children?.length) {
      return { ...base, children: undefined }
   }
   return {
      ...base,
      children: n.children.map((c) => nestedToFlatTree(c, byTaxid)),
   }
}

export function buildHierarchyFromNested(
   nested: NestedTaxonNode,
   byTaxid: Map<string, FlatTreeNode>,
): d3.HierarchyNode<FlatTreeNode> {
   const data = nestedToFlatTree(nested, byTaxid)
   return d3.hierarchy<FlatTreeNode>(data, (d: FlatTreeNode) => d.children)
}
