/** Port of Vue useSpeciesBiosampleGraph (pure). */

export type SankeyNode = { id: string; label: string; type: 'organism' | 'biosample' }

export type SankeyLink = {
   source: string
   target: string
   value: number
   biosampleName: string
   biosampleAccession?: string
   scientificName: string
}

export type SankeyGraph = { nodes: SankeyNode[]; links: SankeyLink[] }

export function buildSpeciesBiosampleGraph(
   organisms: Record<string, unknown>[],
   biosamples: Record<string, unknown>[],
): SankeyGraph {
   const links: SankeyLink[] = []
   const biosampleNodesById = new Map<string, SankeyNode>()

   const sciNameToTaxid = new Map<string, string>()
   for (const org of organisms) {
      const sn = org.scientific_name
      if (sn) sciNameToTaxid.set(String(sn).toLowerCase(), String(org.taxid))
   }

   for (const bs of biosamples) {
      const bsSciName = String(bs.scientific_name ?? '').toLowerCase()
      const matchedTaxid = sciNameToTaxid.get(bsSciName)
      if (!matchedTaxid) continue

      const sourceId = `org:${matchedTaxid}`
      const bsId = `bs:${bs.accession ?? bs.name}`

      if (!biosampleNodesById.has(bsId)) {
         biosampleNodesById.set(bsId, {
            id: bsId,
            label: String(bs.name ?? bs.accession ?? bsId),
            type: 'biosample',
         })
      }

      links.push({
         source: sourceId,
         target: bsId,
         value: 1,
         biosampleName: String(bs.name ?? bs.accession ?? ''),
         biosampleAccession: bs.accession as string | undefined,
         scientificName: String(bs.scientific_name ?? ''),
      })
   }

   const orgIdsWithLinks = new Set(links.map((l) => l.source))
   const nodes: SankeyNode[] = []
   for (const org of organisms) {
      const id = `org:${org.taxid}`
      if (!orgIdsWithLinks.has(id)) continue
      nodes.push({
         id,
         label: String(org.scientific_name ?? org.taxid),
         type: 'organism',
      })
   }
   for (const n of biosampleNodesById.values()) nodes.push(n)

   return { nodes, links }
}
