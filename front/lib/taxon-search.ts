/** Public taxonomy search (NCBI → EBI), matching Vue OrganismSelection behaviour. */

export type TaxonHit = { taxId: string; scientificName: string; lineage?: string }

function looksLikeTaxId(q: string) {
   return /^\d+$/.test(q.trim())
}

export async function searchNcbiTaxon(query: string): Promise<TaxonHit[]> {
   const encoded = encodeURIComponent(query)
   try {
      const res = await fetch(`https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/taxon/${encoded}`)
      if (!res.ok) return []
      const data = (await res.json()) as {
         taxonomy_nodes?: { taxonomy?: { tax_id?: string | number; organism_name?: string; lineage?: string } }[]
      }
      const nodes = data.taxonomy_nodes
      if (!nodes?.length || nodes[0]?.taxonomy == null) return []
      return nodes
         .filter((n) => n.taxonomy?.tax_id != null && n.taxonomy.organism_name)
         .map((n) => ({
            taxId: String(n.taxonomy!.tax_id),
            scientificName: String(n.taxonomy!.organism_name),
            lineage: n.taxonomy!.lineage,
         }))
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
      out.push({ taxId: String(taxId), scientificName: String(scientificName), lineage })
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
