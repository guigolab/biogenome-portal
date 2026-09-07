export type AncestryNode = {
   taxid: string
   name: string
   rank?: string
}

/**
 * Keep only ancestors from the portal root taxon downward (same as server ``ROOT_NODE``,
 * exposed via ``GET /taxons/root`` — see ``getRootTaxid()`` in ``lib/api/taxon.ts``).
 */
export function filterAncestorsFromPortalRoot(
   ancestors: AncestryNode[],
   portalRootTaxid: string | undefined | null,
): AncestryNode[] {
   const root = String(portalRootTaxid ?? '').trim()
   if (!root || ancestors.length === 0) return ancestors
   const idx = ancestors.findIndex((n) => String(n.taxid).trim() === root)
   if (idx < 0) return ancestors
   return ancestors.slice(idx)
}

/** Normalize GET /taxons/:id/ancestors rows for UI. */
export function parseTaxonAncestors(rows: Record<string, unknown>[]): AncestryNode[] {
   const out: AncestryNode[] = []
   for (const r of rows) {
      const taxid = String(r.taxid ?? '').trim()
      const rawName = r.name
      const name =
         typeof rawName === 'string' && rawName.trim()
            ? rawName.trim()
            : taxid || String(r._id ?? '')
      const rank = typeof r.rank === 'string' && r.rank.trim() ? r.rank.trim() : undefined
      if (!taxid && !name) continue
      out.push({ taxid: taxid || name, name: name || taxid, rank })
   }
   return out
}

function normalizeRankKey(r?: string): string {
   return String(r ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
}

export type ClassificationRank = 'kingdom' | 'phylum' | 'class' | 'order' | 'family' | 'genus'

const CLASSIFICATION_ORDER: { label: string; rank: ClassificationRank }[] = [
   { label: 'Kingdom', rank: 'kingdom' },
   { label: 'Phylum', rank: 'phylum' },
   { label: 'Class', rank: 'class' },
   { label: 'Order', rank: 'order' },
   { label: 'Family', rank: 'family' },
   { label: 'Genus', rank: 'genus' },
]

function ancestorMatchingRank(ancestors: AncestryNode[], rank: ClassificationRank): AncestryNode | undefined {
   return ancestors.find((n) => {
      const nr = normalizeRankKey(n.rank)
      if (rank === 'class') return nr === 'class' || nr === 'class_name'
      return nr === rank
   })
}

/** Rank labels + display values from ``SpeciesDetailView`` with optional taxid for taxonomy links. */
export function buildClassificationRows(
   detail: {
      kingdom: string
      phylum: string
      class: string
      order: string
      family: string
      genus: string
   },
   portalAncestors: AncestryNode[],
): { label: string; value: string; taxid: string | null }[] {
   const valueByRank: Record<ClassificationRank, string> = {
      kingdom: detail.kingdom,
      phylum: detail.phylum,
      class: detail.class,
      order: detail.order,
      family: detail.family,
      genus: detail.genus,
   }
   return CLASSIFICATION_ORDER.map(({ label, rank }) => {
      const value = valueByRank[rank] || '—'
      const node = ancestorMatchingRank(portalAncestors, rank)
      const taxid = node && value !== '—' && String(node.taxid).trim() ? String(node.taxid).trim() : null
      return { label, value, taxid }
   })
}

