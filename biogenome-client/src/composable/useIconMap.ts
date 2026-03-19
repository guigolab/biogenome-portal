export const iconMap: Record<string, { icon: string; color: string }> = {
   biosamples: { icon: 'fa-vial', color: 'iconBiosamples' },
   local_samples: { icon: 'fa-flask', color: 'iconLocalSamples' },
   reads: { icon: 'fa-folder', color: 'iconReads' },
   assemblies: { icon: 'fa-dna', color: 'iconAssemblies' },
   annotations: { icon: 'fa-bars-staggered', color: 'iconAnnotations' },
   organisms: { icon: 'fa-paw', color: 'iconOrganisms' },
   submitted_biosamples: { icon: 'fa-vial', color: 'iconSubmittedBiosamples' },
   map: { icon: 'fa-map-location-dot', color: 'iconMap' },
   // Internal link actions (DataItemDetail, etc.)
   download: { icon: 'fa-file-arrow-down', color: 'secondary' },
   genomeBrowser: { icon: 'fa-dna', color: 'primary' },
}
