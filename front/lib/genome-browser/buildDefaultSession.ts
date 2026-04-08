import type { GenomeAnnotationRow } from '@/lib/api/assemblies'

/** Browser chromosomes: server provides jbrowse_ref_name + length_bp (GET /jbrowse/assemblies/.../context). */
export type ChromosomeRow = {
   accession_version: string
   metadata?: Record<string, unknown>
   jbrowse_ref_name: string
   length_bp: number
}

export type AssemblyForJBrowse = {
   accession: string
   assembly_name?: string
}

/**
 * Annotrieve-style defaultSession: only FeatureTracks in the view; ref sequence lives on assembly.
 * `assemblyAccession` is both the MST assembly `name` and the qualifier stripped from contig ids.
 */
export function buildDefaultSession(
   assemblyAccession: string,
   annotations: GenomeAnnotationRow[],
   chromosomes: ChromosomeRow[],
) {
   const sessionTracks = annotations.filter((a) => a.name?.trim()).map((ann) => ({
      type: 'FeatureTrack',
      configuration: ann.name,
      displays: [
         {
            type: 'LinearBasicDisplay',
            configuration: `${ann.name}_TrackDisplay`,
         },
      ],
   }))

   const first = chromosomes[0]
   // Must match RefGet `sequenceData[].name` (never use assembly accession as a seq ref — it is not a contig).
   const refName = (first?.jbrowse_ref_name?.trim() || first?.accession_version?.trim() || '').trim()
   const len = first && first.length_bp > 0 ? first.length_bp : 0
   const windowEnd = len > 0 ? Math.min(100_000, len) : 100_000

   return {
      name: 'Genome browser',
      margin: 0,
      view: {
         id: `${assemblyAccession}-linearGenomeView`,
         type: 'LinearGenomeView',
         minimized: false,
         tracks: sessionTracks,
         displayedRegions: [
            {
               refName,
               start: 0,
               end: windowEnd,
               reversed: false,
               assemblyName: assemblyAccession,
            },
         ],
      },
   }
}
