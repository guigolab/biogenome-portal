/** Build a public URL for an embedded Organism ``publications`` row (source + id). */
export function publicationExternalUrl(source: string, id: string): string | null {
   const sid = id.trim()
   if (!sid) return null
   const s = source.trim()
   if (s === 'DOI' || s.includes('DOI')) {
      return `https://doi.org/${encodeURIComponent(sid)}`
   }
   if (s.includes('PubMed ID') && !s.includes('Central')) {
      return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(sid)}/`
   }
   if (s.includes('Central') || s.includes('PMC')) {
      const pmc = sid.replace(/^PMC/i, '')
      return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${encodeURIComponent(pmc)}/`
   }
   return null
}

export type ParsedPublication = { source: string; id: string }

function normalizePublicationSource(raw: unknown): string {
   if (raw == null) return ''
   if (typeof raw === 'string') return raw.trim()
   if (typeof raw === 'object' && raw !== null && 'value' in raw) {
      const v = (raw as { value?: unknown }).value
      return typeof v === 'string' ? v.trim() : String(v ?? '').trim()
   }
   return String(raw).trim()
}

/** Parse a single embedded publication (``genome_publication`` or list row). */
export function parseOrganismPublication(raw: unknown): ParsedPublication | null {
   if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
   const o = raw as Record<string, unknown>
   const id = String(o.id ?? '').trim()
   if (!id) return null
   const source = normalizePublicationSource(o.source) || 'Publication'
   return { source, id }
}

/** Parse an organism ``publications`` list from API JSON. */
export function parseOrganismPublications(raw: unknown): ParsedPublication[] {
   if (!Array.isArray(raw)) return []
   const out: ParsedPublication[] = []
   for (const item of raw) {
      const parsed = parseOrganismPublication(item)
      if (parsed) out.push(parsed)
   }
   return out
}

/** True when two publication rows refer to the same source + identifier. */
export function publicationsMatch(a: ParsedPublication, b: ParsedPublication): boolean {
   return a.source === b.source && a.id === b.id
}
