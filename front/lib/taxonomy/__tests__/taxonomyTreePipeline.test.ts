import { describe, it, expect } from 'vitest'

import {
   pruneByRankStrict,
   countNestedTreeLeaves,
   buildTruncationLookups,
   collectRanksPresentInSubtree,
   rankFilterOptionsForSubtree,
   allowedRanksFromLookups,
   pickSubtreeApiRank,
   findSubtree,
   collectTaxidsUnder,
   filterRowsForTaxids,
   buildTreeMaps,
} from '@/lib/taxonomy/taxonomyTreePipeline'
import type { NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'
import type { SubtreeLookupResponse } from '@/lib/api/tree'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(
   taxid: string,
   rank: string,
   children: NestedTaxonNode[] = [],
): NestedTaxonNode {
   return { taxid, name: taxid, rank, leaves: 0, children }
}

// ---------------------------------------------------------------------------
// findSubtree
// ---------------------------------------------------------------------------

describe('findSubtree', () => {
   const tree = node('root', '', [
      node('a', 'kingdom', [
         node('a1', 'phylum'),
         node('a2', 'phylum'),
      ]),
      node('b', 'kingdom'),
   ])

   it('finds root itself', () => {
      expect(findSubtree(tree, 'root')?.taxid).toBe('root')
   })

   it('finds a direct child', () => {
      expect(findSubtree(tree, 'a')?.taxid).toBe('a')
   })

   it('finds a grandchild', () => {
      expect(findSubtree(tree, 'a1')?.taxid).toBe('a1')
   })

   it('returns null for missing taxid', () => {
      expect(findSubtree(tree, 'zzz')).toBeNull()
   })

   it('returns null for null input', () => {
      expect(findSubtree(null, 'root')).toBeNull()
   })
})

// ---------------------------------------------------------------------------
// pruneByRankStrict
// ---------------------------------------------------------------------------

describe('pruneByRankStrict', () => {
   /**
    * Tree:
    *   root (no rank)
    *     ├─ ka (kingdom)
    *     │    ├─ pha (phylum)
    *     │    └─ phb (phylum)
    *     └─ kb (kingdom)
    *          └─ no_phylum_branch (order)  ← no phylum descendant
    */
   const tree = node('root', '', [
      node('ka', 'kingdom', [
         node('pha', 'phylum'),
         node('phb', 'phylum'),
      ]),
      node('kb', 'kingdom', [
         node('order_only', 'order'),
      ]),
   ])

   it('keeps only matching rank nodes as leaves', () => {
      const pruned = pruneByRankStrict(tree, 'kingdom')!
      expect(pruned.children?.map((c) => c.taxid)).toEqual(['ka', 'kb'])
      expect(pruned.children?.every((c) => (c.children?.length ?? 0) === 0)).toBe(true)
   })

   it('drops branches with no target rank descendants', () => {
      const pruned = pruneByRankStrict(tree, 'phylum')!
      // kb has no phylum descendant → dropped
      expect(pruned.children?.map((c) => c.taxid)).toEqual(['ka'])
      expect(pruned.children![0]!.children?.map((c) => c.taxid)).toEqual(['pha', 'phb'])
   })

   it('returns null when no match anywhere', () => {
      expect(pruneByRankStrict(tree, 'genus')).toBeNull()
   })

   it('returns null for null input', () => {
      expect(pruneByRankStrict(null, 'kingdom')).toBeNull()
   })

})

// ---------------------------------------------------------------------------
// countNestedTreeLeaves
// ---------------------------------------------------------------------------

describe('countNestedTreeLeaves', () => {
   it('single node with no children → 1', () => {
      expect(countNestedTreeLeaves(node('a', 'kingdom'))).toBe(1)
   })

   it('counts topology tips, not organisms', () => {
      const t = node('root', '', [
         node('a', 'phylum', [node('a1', 'genus'), node('a2', 'genus')]),
         node('b', 'phylum'),
      ])
      expect(countNestedTreeLeaves(t)).toBe(3)
   })

   it('returns 0 for null', () => {
      expect(countNestedTreeLeaves(null)).toBe(0)
   })
})

// ---------------------------------------------------------------------------
// collectRanksPresentInSubtree
// ---------------------------------------------------------------------------

describe('collectRanksPresentInSubtree', () => {
   it('collects all ranks in tree as-is', () => {
      const t = node('root', '', [
         node('k', 'kingdom', [node('ph', 'phylum', [node('cl', 'class')])]),
      ])
      const ranks = collectRanksPresentInSubtree(t)
      expect(ranks.has('kingdom')).toBe(true)
      expect(ranks.has('phylum')).toBe(true)
      expect(ranks.has('class')).toBe(true)
   })

   it('returns empty set for null', () => {
      expect(collectRanksPresentInSubtree(null).size).toBe(0)
   })
})

// ---------------------------------------------------------------------------
// buildTruncationLookups
// ---------------------------------------------------------------------------

describe('buildTruncationLookups', () => {
   const tree = node('root', '', [
      node('ka', 'kingdom', [
         node('pha', 'phylum'),
         node('phb', 'phylum'),
      ]),
   ])

   it('uses strict counts (only matching rank nodes)', () => {
      const lookups = buildTruncationLookups(tree)
      expect(lookups['kingdom']?.total_leaves).toBe(1) // only ka
      expect(lookups['phylum']?.total_leaves).toBe(2)  // pha + phb
      expect(lookups['genus']?.total_leaves).toBe(0)   // none
   })

   it('includes all TREE_RANK_FILTER_OPTIONS keys', () => {
      const lookups = buildTruncationLookups(tree)
      ;['kingdom', 'phylum', 'class', 'order', 'family', 'genus'].forEach((r) => {
         expect(lookups[r]).toBeDefined()
      })
   })
})

// ---------------------------------------------------------------------------
// rankFilterOptionsForSubtree
// ---------------------------------------------------------------------------

describe('rankFilterOptionsForSubtree', () => {
   it('only returns ranks present in subtree with positive leaves', () => {
      const lookups: Record<string, SubtreeLookupResponse> = {
         kingdom: { taxid: 't', rank_level: 'kingdom', total_nodes: 0, total_leaves: 2 },
         phylum: { taxid: 't', rank_level: 'phylum', total_nodes: 0, total_leaves: 5 },
         class: { taxid: 't', rank_level: 'class', total_nodes: 0, total_leaves: 0 },
         order: { taxid: 't', rank_level: 'order', total_nodes: 0, total_leaves: 0 },
         family: { taxid: 't', rank_level: 'family', total_nodes: 0, total_leaves: 0 },
         genus: { taxid: 't', rank_level: 'genus', total_nodes: 0, total_leaves: 0 },
      }
      const present = new Set(['kingdom', 'phylum'])
      const opts = rankFilterOptionsForSubtree(lookups, present)
      expect(opts).toEqual(['kingdom', 'phylum'])
   })

   it('excludes ranks with zero leaves even if present', () => {
      const lookups: Record<string, SubtreeLookupResponse> = {
         kingdom: { taxid: 't', rank_level: 'kingdom', total_nodes: 0, total_leaves: 0 },
         phylum: { taxid: 't', rank_level: 'phylum', total_nodes: 0, total_leaves: 3 },
         class: { taxid: 't', rank_level: 'class', total_nodes: 0, total_leaves: 0 },
         order: { taxid: 't', rank_level: 'order', total_nodes: 0, total_leaves: 0 },
         family: { taxid: 't', rank_level: 'family', total_nodes: 0, total_leaves: 0 },
         genus: { taxid: 't', rank_level: 'genus', total_nodes: 0, total_leaves: 0 },
      }
      const present = new Set(['kingdom', 'phylum'])
      const opts = rankFilterOptionsForSubtree(lookups, present)
      expect(opts).toEqual(['phylum'])
   })
})

// ---------------------------------------------------------------------------
// allowedRanksFromLookups + pickSubtreeApiRank
// ---------------------------------------------------------------------------

describe('allowedRanksFromLookups', () => {
   it('excludes ranks over MAX_TREE_LEAVES (2000)', () => {
      const lookups: Record<string, SubtreeLookupResponse> = {
         kingdom: { taxid: 't', rank_level: 'kingdom', total_nodes: 0, total_leaves: 5 },
         phylum: { taxid: 't', rank_level: 'phylum', total_nodes: 0, total_leaves: 3000 },
         class: { taxid: 't', rank_level: 'class', total_nodes: 0, total_leaves: 0 },
         order: { taxid: 't', rank_level: 'order', total_nodes: 0, total_leaves: 0 },
         family: { taxid: 't', rank_level: 'family', total_nodes: 0, total_leaves: 0 },
         genus: { taxid: 't', rank_level: 'genus', total_nodes: 0, total_leaves: 0 },
      }
      expect(allowedRanksFromLookups(lookups)).toEqual(['kingdom'])
   })
})

describe('pickSubtreeApiRank', () => {
   const lookups: Record<string, SubtreeLookupResponse> = {
      kingdom: { taxid: 't', rank_level: 'kingdom', total_nodes: 0, total_leaves: 5 },
      phylum: { taxid: 't', rank_level: 'phylum', total_nodes: 0, total_leaves: 50 },
      class: { taxid: 't', rank_level: 'class', total_nodes: 0, total_leaves: 500 },
      order: { taxid: 't', rank_level: 'order', total_nodes: 0, total_leaves: 5000 },
      family: { taxid: 't', rank_level: 'family', total_nodes: 0, total_leaves: 0 },
      genus: { taxid: 't', rank_level: 'genus', total_nodes: 0, total_leaves: 0 },
   }

   it('picks finest rank within MAX_TREE_LEAVES', () => {
      const { rank, usedFallback } = pickSubtreeApiRank(lookups, null)
      expect(rank).toBe('class')
      expect(usedFallback).toBe(false)
   })

   it('honours a valid requested rank', () => {
      const { rank } = pickSubtreeApiRank(lookups, 'phylum')
      expect(rank).toBe('phylum')
   })

   it('ignores an over-cap requested rank and picks finest allowed', () => {
      const { rank } = pickSubtreeApiRank(lookups, 'order')
      expect(rank).toBe('class')
   })

   it('uses usedFallback=true when nothing is within cap', () => {
      const bigLookups: Record<string, SubtreeLookupResponse> = Object.fromEntries(
         ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'].map((r) => [
            r,
            { taxid: 't', rank_level: r, total_nodes: 0, total_leaves: 3000 },
         ]),
      )
      const { rank, usedFallback } = pickSubtreeApiRank(bigLookups, null)
      expect(rank).toBe('kingdom')
      expect(usedFallback).toBe(true)
   })
})

// ---------------------------------------------------------------------------
// collectTaxidsUnder
// ---------------------------------------------------------------------------

describe('collectTaxidsUnder', () => {
   it('collects all taxids in subtree', () => {
      const t = node('root', '', [
         node('a', 'kingdom', [node('a1', 'phylum')]),
         node('b', 'kingdom'),
      ])
      const ids = collectTaxidsUnder(t)
      expect([...ids].sort()).toEqual(['a', 'a1', 'b', 'root'])
   })
})

// ---------------------------------------------------------------------------
// filterRowsForTaxids
// ---------------------------------------------------------------------------

describe('filterRowsForTaxids', () => {
   const fields = ['taxid', 'name', 'rank']
   const rows: (string | number | null)[][] = [
      ['1', 'Root', 'no rank'],
      ['2', 'Bacteria', 'kingdom'],
      ['3', 'Archaea', 'kingdom'],
   ]

   it('keeps only rows whose taxid is in the set', () => {
      const result = filterRowsForTaxids(fields, rows, new Set(['1', '3']))
      expect(result.map((r) => r[0])).toEqual(['1', '3'])
   })

   it('returns empty when taxid field missing', () => {
      expect(filterRowsForTaxids(['name', 'rank'], rows, new Set(['1']))).toEqual([])
   })
})

// ---------------------------------------------------------------------------
// buildTreeMaps
// ---------------------------------------------------------------------------

describe('buildTreeMaps', () => {
   it('builds byTaxid and rowByTaxid maps', () => {
      const fields = [
         'taxid', 'parent_taxid', 'name', 'rank',
         'organisms_count', 'assemblies_count', 'reads_count',
         'biosamples_count', 'local_samples_count', 'genome_annotations_count',
      ]
      const rows: (string | number | null)[][] = [
         ['10', null, 'Bacteria', 'kingdom', 5, 2, 0, 3, 0, 0],
      ]
      const { byTaxid, rowByTaxid } = buildTreeMaps(fields, rows)
      expect(byTaxid.get('10')?.scientific_name).toBe('Bacteria')
      expect(rowByTaxid.get('10')?.rank).toBe('kingdom')
   })
})
