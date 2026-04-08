export interface Species {
  id: string
  scientificName: string
  commonName: string
  taxonId: string
  kingdom: string
  phylum: string
  class: string
  order: string
  family: string
  genus: string
  conservationStatus: 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX'
  sequencingStatus: 'not_started' | 'sample_collected' | 'sequencing' | 'assembly' | 'annotation' | 'completed'
  genomeCount: number
  sampleCount: number
  coordinates: { lat: number; lng: number }[]
  imageUrl?: string
}

/** Map legacy mock `Species` to an API-like organism row for `SpeciesCard`. */
export function speciesMockToOrganismRow(s: Species): Record<string, unknown> {
  return {
    taxid: s.taxonId,
    scientific_name: s.scientificName,
    insdc_common_name: s.commonName,
    assemblies_count: s.genomeCount,
    biosamples_count: s.sampleCount,
    reads_count: 0,
    taxon_lineage: [s.kingdom, s.phylum, s.class, s.order, s.family, s.genus],
    ...(s.imageUrl ? { image: s.imageUrl } : {}),
  }
}







export const statusColors: Record<Species['conservationStatus'], string> = {
  LC: 'bg-chart-1 text-primary-foreground',
  NT: 'bg-chart-2 text-accent-foreground',
  VU: 'bg-chart-4 text-accent-foreground',
  EN: 'bg-destructive text-destructive-foreground',
  CR: 'bg-destructive text-destructive-foreground',
  EW: 'bg-muted text-muted-foreground',
  EX: 'bg-muted text-muted-foreground',
}

export const statusLabels: Record<Species['conservationStatus'], string> = {
  LC: 'Least Concern',
  NT: 'Near Threatened',
  VU: 'Vulnerable',
  EN: 'Endangered',
  CR: 'Critically Endangered',
  EW: 'Extinct in Wild',
  EX: 'Extinct',
}

export const sequencingStatusLabels: Record<Species['sequencingStatus'], string> = {
  not_started: 'Not Started',
  sample_collected: 'Sample Collected',
  sequencing: 'Sequencing',
  assembly: 'Assembly',
  annotation: 'Annotation',
  completed: 'Completed',
}

export const sequencingStatusColors: Record<Species['sequencingStatus'], string> = {
  not_started: 'bg-muted text-muted-foreground',
  sample_collected: 'bg-chart-4/20 text-chart-4',
  sequencing: 'bg-chart-2/20 text-chart-2',
  assembly: 'bg-chart-3/20 text-chart-3',
  annotation: 'bg-chart-5/20 text-chart-5',
  completed: 'bg-chart-1/20 text-chart-1',
}
