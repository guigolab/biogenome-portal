import { computed, type Ref } from 'vue'

export interface SankeyNode {
   id: string
   label: string
   type: 'organism' | 'biosample'
}

export interface SankeyLink {
   source: string
   target: string
   value: number
   biosampleName: string
   biosampleAccession?: string
   scientificName: string
}

export interface SankeyGraph {
   nodes: SankeyNode[]
   links: SankeyLink[]
}

/**
 * Builds a Sankey graph from organism and biosample data.
 * Only organisms with at least one matching submitted biosample appear as nodes.
 * Each unique biosample is a target node; link value is always 1 (each sample = 1 link).
 */
export function useSpeciesBiosampleGraph(
   organisms: Ref<Record<string, any>[]>,
   biosamples: Ref<Record<string, any>[]>,
): { graph: ReturnType<typeof computed<SankeyGraph>> } {
   const graph = computed<SankeyGraph>(() => {
      const links: SankeyLink[] = []
      const biosampleNodesById = new Map<string, SankeyNode>()

      const sciNameToTaxid = new Map<string, string>()
      for (const org of organisms.value) {
         if (org.scientific_name) {
            sciNameToTaxid.set(String(org.scientific_name).toLowerCase(), String(org.taxid))
         }
      }

      for (const bs of biosamples.value) {
         const bsSciName = String(bs.scientific_name ?? '').toLowerCase()
         const matchedTaxid = sciNameToTaxid.get(bsSciName)
         if (!matchedTaxid) continue

         const sourceId = `org:${matchedTaxid}`
         const bsId = `bs:${bs.accession ?? bs.name}`

         if (!biosampleNodesById.has(bsId)) {
            biosampleNodesById.set(bsId, {
               id: bsId,
               label: bs.name ?? bs.accession ?? bsId,
               type: 'biosample',
            })
         }

         links.push({
            source: sourceId,
            target: bsId,
            value: 1,
            biosampleName: bs.name ?? bs.accession ?? '',
            biosampleAccession: bs.accession,
            scientificName: bs.scientific_name ?? '',
         })
      }

      const orgIdsWithLinks = new Set(links.map((l) => l.source))

      const nodes: SankeyNode[] = []
      for (const org of organisms.value) {
         const id = `org:${org.taxid}`
         if (!orgIdsWithLinks.has(id)) continue
         nodes.push({ id, label: org.scientific_name ?? org.taxid, type: 'organism' })
      }
      for (const n of biosampleNodesById.values()) {
         nodes.push(n)
      }

      return { nodes, links }
   })

   return { graph }
}
