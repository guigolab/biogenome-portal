export type SpeciesSortMode = 'alpha' | 'recent' | 'samples'

export const SPECIES_SORT_MODES: SpeciesSortMode[] = ['alpha', 'recent', 'samples']

export function speciesSortToApi(mode: SpeciesSortMode): {
   sort_column: string
   sort_order: 'asc' | 'desc'
} {
   switch (mode) {
      case 'alpha':
         return { sort_column: 'scientific_name', sort_order: 'asc' }
      case 'recent':
         return { sort_column: 'id', sort_order: 'desc' }
      case 'samples':
         return { sort_column: 'biosamples_count', sort_order: 'desc' }
   }
}

