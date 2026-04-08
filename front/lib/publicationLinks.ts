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
