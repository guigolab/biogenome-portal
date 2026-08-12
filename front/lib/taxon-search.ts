/** Public taxonomy search (NCBI → EBI), matching Vue OrganismSelection behaviour. */

export type TaxonHit = {
   taxId: string
   scientificName: string
   lineage?: string
   /** NCBI/EBI taxonomic rank when provided (e.g. species, genus, subspecies). */
   rank?: string
   /** EBI Taxonomy REST `binomial` flag when present. */
   binomial?: boolean
}

function looksLikeTaxId(q: string) {
   return /^\d+$/.test(q.trim())
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
   if (typeof value === 'boolean') return value
   if (typeof value === 'string') {
      const v = value.trim().toLowerCase()
      if (v === 'true') return true
      if (v === 'false') return false
   }
   return undefined
}

/** Strip trailing parenthetical authority and collapse whitespace. */
export function normalizeScientificNameForBinomialCheck(name: string): string {
   return (name || '')
      .trim()
      .replace(/\s*\([^)]*\)\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim()
}

/** True when the name looks like a Genus + species epithet (exactly two words). */
export function isBinomialScientificName(name: string): boolean {
   const parts = normalizeScientificNameForBinomialCheck(name).split(' ').filter(Boolean)
   return parts.length === 2
}

export function isSpeciesRank(rank?: string | null): boolean {
   if (!rank?.trim()) return false
   return rank.trim().toLowerCase() === 'species'
}

/**
 * Warn when the selected taxon is not species-rank and/or not binomial.
 * Returns null when the selection looks like a normal species.
 */
export function taxonSpeciesSuitabilityWarning(
   hit: Pick<TaxonHit, 'scientificName' | 'rank' | 'binomial'>,
): string | null {
   const issues: string[] = []
   const rank = hit.rank?.trim()

   if (rank && !isSpeciesRank(rank)) {
      issues.push(`taxonomic rank is “${rank}” (expected species)`)
   }

   const binomialOk =
      typeof hit.binomial === 'boolean' ? hit.binomial : isBinomialScientificName(hit.scientificName)
   if (!binomialOk) {
      issues.push('scientific name is not a binomial (Genus species)')
   }

   if (!issues.length) return null

   return (
      `This taxon may not be a species: ${issues.join('; ')}. ` +
      'Prefer a species-rank binomial unless you intentionally need a higher or lower rank.'
   )
}

export async function searchNcbiTaxon(query: string): Promise<TaxonHit[]> {
   const encoded = encodeURIComponent(query)
   try {
      const res = await fetch(`https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/taxon/${encoded}`)
      if (!res.ok) return []
      const data = (await res.json()) as {
         taxonomy_nodes?: {
            taxonomy?: {
               tax_id?: string | number
               organism_name?: string
               lineage?: string | number[]
               rank?: string
            }
         }[]
      }
      const nodes = data.taxonomy_nodes
      if (!nodes?.length || nodes[0]?.taxonomy == null) return []
      return nodes
         .filter((n) => n.taxonomy?.tax_id != null && n.taxonomy.organism_name)
         .map((n) => {
            const tax = n.taxonomy!
            let lineage: string | undefined
            if (typeof tax.lineage === 'string') lineage = tax.lineage
            else if (Array.isArray(tax.lineage)) lineage = tax.lineage.map(String).join(';')
            return {
               taxId: String(tax.tax_id),
               scientificName: String(tax.organism_name),
               lineage,
               rank: tax.rank ? String(tax.rank) : undefined,
            }
         })
   } catch {
      return []
   }
}

function normalizeEbiTaxa(data: unknown): TaxonHit[] {
   if (data == null) return []
   const raw = Array.isArray(data) ? data : [data]
   const out: TaxonHit[] = []
   for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const taxId = o.taxId ?? o.tax_id
      const scientificName = o.scientificName ?? o.scientific_name ?? o.name
      if (taxId == null || scientificName == null) continue
      let lineage: string | undefined
      if (typeof o.lineage === 'string') lineage = o.lineage
      else if (Array.isArray(o.lineage)) lineage = o.lineage.map(String).join(';')
      const rankRaw = o.rank
      const rank = typeof rankRaw === 'string' && rankRaw.trim() ? rankRaw.trim() : undefined
      out.push({
         taxId: String(taxId),
         scientificName: String(scientificName),
         lineage,
         rank,
         binomial: parseOptionalBoolean(o.binomial),
      })
   }
   return out
}

export async function searchEbiTaxon(rawQuery: string): Promise<TaxonHit[]> {
   const subPath = looksLikeTaxId(rawQuery) ? 'tax-id' : 'scientific-name'
   const encoded = encodeURIComponent(rawQuery)
   try {
      const res = await fetch(`https://www.ebi.ac.uk/ena/taxonomy/rest/${subPath}/${encoded}`)
      if (!res.ok) return []
      const data = await res.json()
      return normalizeEbiTaxa(data)
   } catch {
      return []
   }
}

export async function searchExternalTaxons(query: string): Promise<TaxonHit[]> {
   const q = query.trim()
   if (q.length < 2) return []
   const ncbi = await searchNcbiTaxon(q)
   if (ncbi.length) return ncbi
   return searchEbiTaxon(q)
}
