import type { InsdcCountFilterCode } from '@/lib/organismStatusLabels'

/** Species-list Data accordion options (excludes `none`). */
export const SPECIES_DATA_FILTER_CODES = ['bio', 'asm', 'reads', 'ann'] as const

export type SpeciesDataFilterCode = (typeof SPECIES_DATA_FILTER_CODES)[number]

export function isSpeciesDataFilterCode(value: string): value is SpeciesDataFilterCode {
   return (SPECIES_DATA_FILTER_CODES as readonly string[]).includes(value)
}

export function sortSpeciesDataFilterCodes(codes: InsdcCountFilterCode[]): SpeciesDataFilterCode[] {
   const order = new Map(SPECIES_DATA_FILTER_CODES.map((c, i) => [c, i] as const))
   return codes
      .filter(isSpeciesDataFilterCode)
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
}
