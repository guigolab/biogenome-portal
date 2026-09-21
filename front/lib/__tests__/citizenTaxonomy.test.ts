import { describe, expect, it } from 'vitest'

import {
   citizenNodeToQueryParams,
   citizenNodesToHierarchy,
   resolveCitizenTaxonomy,
} from '@/lib/citizenTaxonomy'
import type { CitizenTaxonomyNode } from '@/lib/portal/types'

describe('citizenTaxonomy', () => {
   it('maps numeric taxid to taxon_lineage', () => {
      expect(citizenNodeToQueryParams({ taxid: '8292', labels: { en: 'A' } })).toEqual({
         taxon_lineage: '8292',
      })
   })

   it('maps include + exclude to lineage and nin', () => {
      expect(
         citizenNodeToQueryParams({
            taxid: 'fish',
            labels: { en: 'Fish' },
            include_taxid: '7742',
            exclude_taxids: ['32523'],
         }),
      ).toEqual({
         taxon_lineage: '7742',
         taxon_lineage__nin: '32523',
      })
   })

   it('maps include_taxids to taxon_lineage__in', () => {
      expect(
         citizenNodeToQueryParams({
            taxid: 'marine',
            labels: { en: 'M' },
            include_taxids: ['6073', '6040'],
         }),
      ).toEqual({
         taxon_lineage__in: '6040,6073',
      })
   })

   it('stratifies parent_taxid into a forest', () => {
      const nodes: CitizenTaxonomyNode[] = [
         { taxid: '33208', parent_taxid: null, labels: { en: 'Animals' } },
         { taxid: '7742', parent_taxid: '33208', labels: { en: 'Vertebrates' } },
         { taxid: 'fish', parent_taxid: '7742', labels: { en: 'Fish' }, include_taxid: '7742' },
      ]
      const roots = citizenNodesToHierarchy(nodes)
      expect(roots).toHaveLength(1)
      expect(roots[0].taxid).toBe('33208')
      expect(roots[0].children[0].taxid).toBe('7742')
      expect(roots[0].children[0].children[0].taxid).toBe('fish')
   })

   it('resolveCitizenTaxonomy returns null when missing', () => {
      expect(resolveCitizenTaxonomy(null)).toBeNull()
      expect(resolveCitizenTaxonomy({ general: {} })).toBeNull()
   })
})
