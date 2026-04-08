export const TILE_META: Record<string, { label: string; className: string }> = {
   organisms: { label: 'Species', className: 'border-primary/30 bg-primary/5' },
   assemblies: { label: 'Assemblies', className: 'border-chart-2/40 bg-chart-2/10' },
   reads: { label: 'Reads', className: 'border-muted-foreground/25 bg-muted/50' },
   biosamples: { label: 'Biosamples', className: 'border-chart-3/40 bg-chart-3/10' },
   local_samples: { label: 'Local samples', className: 'border-chart-4/40 bg-chart-4/10' },
   annotations: { label: 'Annotations', className: 'border-chart-5/40 bg-chart-5/10' },
}

export const GOAT_PIPELINE = [
   'sample_collected',
   'sample_acquired',
   'data_generation',
   'in_assembly',
   'insdc_submitted',
   'publication_available',
] as const

export const INSDC_PIPELINE = [
   'biosample_submitted',
   'reads_submitted',
   'assemblies_submitted',
   'annotation_completed',
] as const

export function normKey(k: string) {
   return k.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

export function orderedEntries(
   data: Record<string, number>,
   field: 'goat_status' | 'insdc_status' | 'target_list_status',
): [string, number][] {
   const entries = Object.entries(data)
   const order =
      field === 'goat_status' ? GOAT_PIPELINE : field === 'insdc_status' ? INSDC_PIPELINE : []
   const sortIdx = (k: string) => {
      const n = normKey(k)
      const i = (order as readonly string[]).indexOf(n)
      return i === -1 ? 1000 : i
   }
   return entries.sort((a, b) => sortIdx(a[0]) - sortIdx(b[0]) || a[0].localeCompare(b[0]))
}
