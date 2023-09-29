export const relatedData:Record<string,any>[] = [
    {
      title: 'uiComponents.relatedDataCard.biosamples',
      icon: 'hubs',
      key: 'biosamples',
      route: 'biosample',
      columns: ['accession', 'organism_part'],
    },
    {
      title: 'uiComponents.relatedDataCard.local_samples',
      icon: 'hubs',
      key: 'local_samples',
      route: 'local_sample',
      columns: ['local_id'],
    },
    {
      title: 'uiComponents.relatedDataCard.experiments',
      icon: 'widgets',
      key: 'experiments',
      route: 'experiment',
      columns: ['experiment_accession', 'instrument_platform'],
    },
    {
      title: 'uiComponents.relatedDataCard.assemblies',
      icon: 'library_books',
      key: 'assemblies',
      route: 'assembly',
      columns: ['accession', 'assembly_name', 'assembly_level'],
    },
    {
      title: 'uiComponents.relatedDataCard.annotations',
      icon: 'library_books',
      key: 'annotations',
      route: 'annotation',
      columns: ['name', 'assembly_name'],
    },
  ]