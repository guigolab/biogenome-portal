import type { GenomeAnnotationRow } from '@/lib/api/assemblies'
import type { AssemblyForJBrowse, ChromosomeRow } from '@/lib/genome-browser/buildDefaultSession'
import {
   annotationStableTrackId,
   annotationTrackDisplayName,
} from '@/lib/genome-browser/annotationLabels'

/**
 * Assembly + tracks for createViewState — Annotrieve-style.
 * chr_aliases URL only; sequenceData keys `insdc:${accession_version}`.
 */
export function buildJBrowseViewStateOptions(
   apiBase: string,
   assembly: AssemblyForJBrowse,
   /** INSDC assembly accession — JBrowse `assembly.name` / regions / track `assemblyNames` (not the human title). */
   assemblyAccession: string,
   /** Human-readable assembly label for annotation track titles only. */
   annotationAssemblyDisplayName: string,
   chromosomes: ChromosomeRow[],
   annotations: GenomeAnnotationRow[],
) {
   const accession = assembly.accession
   const seqTrackId = `${accession}-seq`

   const sequenceData: Record<string, { name: string; size: number }> = {}
   for (const chr of chromosomes) {
      const key = `insdc:${chr.accession_version}`
      const size = chr.length_bp > 0 ? chr.length_bp : 0
      sequenceData[key] = {
         name: chr.jbrowse_ref_name,
         size,
      }
   }

   const assemblyConfig = {
      name: assemblyAccession,
      refNameAliases: {
         adapter: {
            type: 'RefNameAliasAdapter',
            location: {
               uri: `${apiBase}/assemblies/${encodeURIComponent(accession)}/chr_aliases`,
               locationType: 'UriLocation',
            },
         },
      },
      sequence: {
         name: assemblyAccession,
         trackId: seqTrackId,
         type: 'ReferenceSequenceTrack',
         adapter: {
            type: 'RefGetAdapter',
            sequenceData,
         },
      },
   }

   const tracks = annotations
      .filter((a) => a.name?.trim() && a.gff_gz_location && a.tab_index_location)
      .map((d) => {
         const tab = d.tab_index_location!
         const gff = d.gff_gz_location!
         const trackId = annotationStableTrackId(d)
         const displayName = annotationTrackDisplayName(d, annotationAssemblyDisplayName)
         return {
            type: 'FeatureTrack',
            trackId,
            name: displayName,
            assemblyNames: [assemblyAccession],
            category: ['Genes'],
            adapter: {
               type: 'Gff3TabixAdapter',
               gffGzLocation: {
                  uri: gff,
                  locationType: 'UriLocation',
               },
               index: {
                  location: {
                     uri: tab,
                     locationType: 'UriLocation',
                  },
                  indexType: tab.endsWith('.csi') ? 'CSI' : 'TBI',
               },
            },
            displays: [
               {
                  type: 'LinearBasicDisplay',
                  displayId: `${trackId}_TrackDisplay`,
                  renderer: {
                     type: 'SvgFeatureRenderer',
                     showLabels: true,
                     showDescriptions: true,
                     labels: { descriptionColor: '#8b8b8b' },
                  },
               },
            ],
         }
      })

   return {
      assembly: assemblyConfig,
      tracks,
   }
}
