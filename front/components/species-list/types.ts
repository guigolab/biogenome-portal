export type TaxonOption = {
   taxid: string
   name: string
   rank?: string
   organismsCount?: number
}

export type RankTaxonCache = {
   items: TaxonOption[]
   total: number
   nextOffset: number
   loading: boolean
   loadingMore: boolean
   initialized: boolean
}

export function emptyRankTaxonCache(): RankTaxonCache {
   return {
      items: [],
      total: 0,
      nextOffset: 0,
      loading: false,
      loadingMore: false,
      initialized: false,
   }
}

export function mapTaxonRow(row: Record<string, unknown>): TaxonOption {
   const taxid = String(row.taxid ?? '')
   const name = String(row.name ?? row.taxid ?? '')
   const rank = typeof row.rank === 'string' ? row.rank : undefined
   let organismsCount: number | undefined
   if (typeof row.organisms_count === 'number') organismsCount = row.organisms_count
   else if (typeof row.leaves === 'number') organismsCount = row.leaves
   return { taxid, name, rank, organismsCount }
}
