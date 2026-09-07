/**
 * Organism TSV export columns: API field keys (GET /organisms?fields=…) and UI labels.
 * Nested keys use dot notation; server maps list/embedded values in ``resource_mixins``.
 */

export type OrganismExportFieldDef = { key: string; label: string }

export const ORGANISM_DEFAULT_EXPORT_FIELDS: OrganismExportFieldDef[] = [
   { key: 'scientific_name', label: 'Scientific name' },
   { key: 'taxid', label: 'Taxid' },
   { key: 'insdc_common_name', label: 'INSDC common name' },
]

export const ORGANISM_EXPORT_FIELD_GROUPS: { id: string; label: string; fields: OrganismExportFieldDef[] }[] = [
   {
      id: 'counts',
      label: 'Counts',
      fields: [
         { key: 'assemblies_count', label: 'Assemblies count' },
         { key: 'biosamples_count', label: 'Biosamples count' },
         { key: 'reads_count', label: 'Sequencing runs count' },
         { key: 'genome_annotations_count', label: 'Genome annotations count' },
         { key: 'local_samples_count', label: 'Local samples count' },
      ],
   },
   {
      id: 'taxonomy',
      label: 'Taxonomy & naming',
      fields: [
         { key: 'tolid_prefix', label: 'ToLID prefix' },
         { key: 'sub_project', label: 'Sub-project' },
         { key: 'taxon_lineage', label: 'Taxon lineage (taxids)' },
         { key: 'common_names', label: 'Common names (mapped)' },
         { key: 'metadata.sequencing_type', label: 'Sequencing types' },
      ],
   },
   {
      id: 'lineage_labels',
      label: 'Lineage rank labels',
      fields: [
         { key: 'lineage_rank_labels.kingdom', label: 'Kingdom (name)' },
         { key: 'lineage_rank_labels.phylum', label: 'Phylum (name)' },
         { key: 'lineage_rank_labels.class_name', label: 'Class (name)' },
         { key: 'lineage_rank_labels.order', label: 'Order (name)' },
         { key: 'lineage_rank_labels.family', label: 'Family (name)' },
         { key: 'lineage_rank_labels.genus', label: 'Genus (name)' },
      ],
   },
   {
      id: 'media',
      label: 'Images',
      fields: [{ key: 'images', label: 'Images (URLs + license, mapped)' }],
   },
   {
      id: 'goat',
      label: 'GoaT & lists',
      fields: [
         { key: 'goat_status', label: 'GoaT sequencing status' },
         { key: 'target_list_status', label: 'Target list status' },
         { key: 'insdc_status', label: 'INSDC submission status' },
      ],
   },
   {
      id: 'iucn',
      label: 'IUCN Red List',
      fields: [
         { key: 'iucn_redlist.not_found', label: 'IUCN: not on Red List' },
         { key: 'iucn_redlist.category', label: 'IUCN: category' },
         { key: 'iucn_redlist.population_trend', label: 'IUCN: population trend' },
         { key: 'iucn_redlist.assessment_date', label: 'IUCN: assessment date' },
         { key: 'iucn_redlist.published_year', label: 'IUCN: published year' },
      ],
   },
   {
      id: 'publications',
      label: 'Publications',
      fields: [{ key: 'publications', label: 'Publications (source:id, mapped)' }],
   },
]

/** Stable column order for building the ``fields`` query param. */
export const ORGANISM_EXPORT_KEYS_ORDERED: string[] = [
   ...ORGANISM_DEFAULT_EXPORT_FIELDS.map((f) => f.key),
   ...ORGANISM_EXPORT_FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key)),
]
