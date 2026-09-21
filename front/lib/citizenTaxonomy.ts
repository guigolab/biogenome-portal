import { pickLocalized } from '@/lib/i18n/pickLocalized'
import type {
   CitizenTaxonomyConfig,
   CitizenTaxonomyNode,
   PortalConfig,
} from '@/lib/portal/types'

export const TAXONOMY_BROWSE_MODE_STORAGE_KEY = 'biogenome.taxonomyBrowseMode'

export type TaxonomyBrowseMode = 'citizen' | 'full'

export type CitizenHierarchyNode = CitizenTaxonomyNode & {
   children: CitizenHierarchyNode[]
}

const NUMERIC_TAXID = /^[0-9]+$/

/** Read optional citizen taxonomy from portal config; null when absent or empty. */
export function resolveCitizenTaxonomy(
   config?: PortalConfig | { general?: Record<string, unknown> } | null,
): CitizenTaxonomyConfig | null {
   const raw = config?.general?.citizenTaxonomy
   if (!raw || typeof raw !== 'object') return null
   const nodes = (raw as CitizenTaxonomyConfig).nodes
   if (!Array.isArray(nodes) || nodes.length === 0) return null
   const defaultMode =
      (raw as CitizenTaxonomyConfig).defaultMode === 'full' ? 'full' : 'citizen'
   return { defaultMode, nodes: nodes as CitizenTaxonomyNode[] }
}

export function citizenNodeLabel(node: CitizenTaxonomyNode, locale: string): string {
   return pickLocalized(node.labels, locale, node.taxid)
}

/**
 * Map a citizen node to existing catalog query params.
 * Digits-only `taxid` without include_* is treated as taxon_lineage.
 */
export function citizenNodeToQueryParams(
   node: CitizenTaxonomyNode,
): Record<string, string> {
   const out: Record<string, string> = {}
   const includeMany = (node.include_taxids ?? [])
      .map((t) => String(t).trim())
      .filter(Boolean)
   const includeOne = node.include_taxid?.trim()
   const excludes = (node.exclude_taxids ?? [])
      .map((t) => String(t).trim())
      .filter(Boolean)

   if (includeMany.length > 0) {
      out.taxon_lineage__in = [...includeMany].sort().join(',')
   } else if (includeOne) {
      out.taxon_lineage = includeOne
   } else if (NUMERIC_TAXID.test(String(node.taxid).trim())) {
      out.taxon_lineage = String(node.taxid).trim()
   }

   if (excludes.length > 0) {
      out.taxon_lineage__nin = [...excludes].sort().join(',')
   }
   return out
}

/** Stratify flat citizen nodes into a forest (same parent_taxid pattern as GET /tree). */
export function citizenNodesToHierarchy(
   nodes: CitizenTaxonomyNode[],
): CitizenHierarchyNode[] {
   const byId = new Map<string, CitizenHierarchyNode>()
   for (const n of nodes) {
      const taxid = String(n.taxid ?? '').trim()
      if (!taxid) continue
      byId.set(taxid, { ...n, taxid, children: [] })
   }
   const roots: CitizenHierarchyNode[] = []
   for (const node of byId.values()) {
      const parentKey =
         node.parent_taxid != null && String(node.parent_taxid).trim() !== ''
            ? String(node.parent_taxid).trim()
            : null
      if (!parentKey || !byId.has(parentKey)) {
         roots.push(node)
      } else {
         byId.get(parentKey)!.children.push(node)
      }
   }
   return roots
}

export function findCitizenNode(
   nodes: CitizenTaxonomyNode[],
   taxid: string,
): CitizenTaxonomyNode | null {
   const id = taxid.trim()
   if (!id) return null
   return nodes.find((n) => String(n.taxid).trim() === id) ?? null
}

export function readStoredTaxonomyBrowseMode(
   fallback: TaxonomyBrowseMode,
): TaxonomyBrowseMode {
   if (typeof window === 'undefined') return fallback
   try {
      const v = window.localStorage.getItem(TAXONOMY_BROWSE_MODE_STORAGE_KEY)
      if (v === 'citizen' || v === 'full') return v
   } catch {
      /* ignore */
   }
   return fallback
}

export function writeStoredTaxonomyBrowseMode(mode: TaxonomyBrowseMode): void {
   if (typeof window === 'undefined') return
   try {
      window.localStorage.setItem(TAXONOMY_BROWSE_MODE_STORAGE_KEY, mode)
   } catch {
      /* ignore */
   }
}
