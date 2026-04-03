import * as d3 from 'd3'

import type { FlatTreeNode } from '@/lib/taxonomy/treeTableTypes'
import { BRANCH_PALETTE_DARK, BRANCH_PALETTE_LIGHT } from '@/lib/taxonomy/treeBranchPalette'

export type BranchLegendItem = {
   taxid: string
   name: string
   color: string
}

/** First-level children under the laid-out root, with the same ordinal colors as the canvas tree. */
export function branchLegendFromHierarchy(
   root: d3.HierarchyNode<FlatTreeNode>,
   isDark: boolean,
): BranchLegendItem[] {
   const children = root.children ?? []
   const taxids = children.map((c) => c.data.id).filter(Boolean)
   if (taxids.length === 0) return []
   const palette = [...(isDark ? BRANCH_PALETTE_DARK : BRANCH_PALETTE_LIGHT)]
   const scale = d3.scaleOrdinal<string>().domain(taxids).range(palette)
   return children
      .filter((c) => c.data.id)
      .map((c) => ({
         taxid: c.data.id,
         name: (c.data.scientific_name || c.data.id).replace(/_/g, ' '),
         color: scale(c.data.id) as string,
      }))
}
