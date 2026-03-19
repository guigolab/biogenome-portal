import { Annotation, Assembly, ChromosomeInterface } from '../data/types'

export function buildGenomeBrowserSession(
   assembly: Assembly,
   selectedAnnotations: Annotation[],
   selectedChromosomes: ChromosomeInterface[],
) {
   const tracks = [
      {
         type: 'ReferenceSequenceTrack',
         configuration: assembly.accession,
         displays: [
            {
               type: 'LinearReferenceSequenceDisplay',
               configuration: `${assembly.accession}-LinearReferenceSequenceDisplay`,
            },
         ],
      },
      ...selectedAnnotations.map((ann) => ({
         type: 'FeatureTrack',
         configuration: ann.name,
         displays: [
            {
               type: 'LinearBasicDisplay',
               configuration: `${ann.name}-LinearBasicDisplay`,
            },
         ],
      })),
   ]

   const displayedRegions = selectedChromosomes.map((chr) => ({
      reversed: false,
      refName: chr.metadata?.chr_name || chr.metadata?.name || chr.accession_version,
      start: 0,
      end: chr.metadata?.length,
      assemblyName: assembly.assembly_name,
   }))

   return {
      id: assembly.accession,
      name: assembly.assembly_name,
      view: {
         id: assembly.accession,
         type: 'LinearGenomeView',
         minimized: false,
         tracks,
         displayedRegions,
      },
   }
}
