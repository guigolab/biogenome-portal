/** Display labels for Organism enum fields (aligned with Vue itemConfigs + server/db/enums). */

/** API values in pipeline order (for filters / stats keys). */
export const GOAT_STATUS_VALUES = [
   'No Entry',
   'Sample Collected',
   'Sample Acquired',
   'Data Generation',
   'In Assembly',
   'INSDC Submitted',
   'Publication Available',
] as const

export const INSDC_STATUS_VALUES = [
   'No Entry',
   'Biosample Submitted',
   'Reads Submitted',
   'Assemblies Submitted',
   'Annotation Completed',
] as const

/** Stored on Organism; stats keys use these snake_case strings + "No Entry". */
export const TARGET_LIST_STATUS_VALUES = ['No Entry', 'long_list', 'family_representative', 'other_priority'] as const

/** Display strings aligned with `biogenome-client/src/i18n/locales/en.json` (`goat.*`, `insdc.*`). */
export const GOAT_STATUS_LABELS: Record<string, string> = {
   'No Entry': 'Missing Status',
   'Sample Collected': 'Sample Collected',
   'Sample Acquired': 'Sample Acquired',
   'Data Generation': 'Data Generation',
   'In Assembly': 'In Assembly',
   'INSDC Submitted': 'INSDC Submitted',
   'Publication Available': 'Publication Available',
}

export const INSDC_STATUS_LABELS: Record<string, string> = {
   'No Entry': 'Missing Status',
   'Biosample Submitted': 'Biosample Submitted',
   'Reads Submitted': 'Reads Submitted',
   'Assemblies Submitted': 'Assemblies Submitted',
   'Annotation Completed': 'Annotation completed',
}

export const TARGET_LIST_STATUS_LABELS: Record<string, string> = {
   'No Entry': 'Not on target list',
   long_list: 'Long list',
   family_representative: 'Family representative',
   other_priority: 'Other priority',
}

/** Codes for `GET /organisms?insdc_counts_any=` (comma-separated, OR). */
export const INSDC_COUNT_FILTER_CODES = ['none', 'bio', 'reads', 'asm', 'ann'] as const
export type InsdcCountFilterCode = (typeof INSDC_COUNT_FILTER_CODES)[number]

export const INSDC_COUNT_FILTER_LABELS: Record<InsdcCountFilterCode, string> = {
   none: 'Missing Status',
   bio: 'Biosample Submitted',
   reads: 'Reads Submitted',
   asm: 'Assemblies Submitted',
   ann: 'Annotation completed',
}

/** Same copy as Vue `insdc.*` / assembly-style line for annotation (not in Vue itemConfigs). */
export const INSDC_COUNT_FILTER_DESCRIPTIONS: Record<InsdcCountFilterCode, string> = {
   none: 'No INSDC data linked',
   bio: 'At least one INSDC BioSample linked',
   reads: 'At least one INSDC Experiment linked',
   asm: 'At least one INSDC Assembly linked',
   ann: 'At least one genome annotation linked in the catalog',
}

/** Tailwind classes for pipeline step icon circles (index cycles chart tokens). */
export const PIPELINE_SWATCH_CLASSES = [
   'bg-muted text-muted-foreground',
   'bg-chart-1/15 text-chart-1',
   'bg-chart-2/15 text-chart-2',
   'bg-chart-3/15 text-chart-3',
   'bg-chart-4/15 text-chart-4',
   'bg-chart-5/15 text-chart-5',
   'bg-primary/15 text-primary',
] as const

export type StatusPipelineStep = {
   value: string
   label: string
   /** Short explanation for tooltips and pipeline legend (aligned with Vue i18n intent). */
   description: string
   swatchIndex: number
}

function pipelineStep(value: string, label: string, description: string, swatchIndex: number): StatusPipelineStep {
   return { value, label, description, swatchIndex }
}

/** Ordered steps for status tracker UI (values must match API aggregation keys). */
export const GOAT_PIPELINE_STEPS: StatusPipelineStep[] = [
   pipelineStep(
      'No Entry',
      GOAT_STATUS_LABELS['No Entry'],
      'GoaT status not available',
      0,
   ),
   pipelineStep(
      'Sample Collected',
      GOAT_STATUS_LABELS['Sample Collected'],
      'A sample for the species has been collected by field workers but has not yet been sent to a sequencing center',
      1,
   ),
   pipelineStep(
      'Sample Acquired',
      GOAT_STATUS_LABELS['Sample Acquired'],
      'A sample for the species has been acquired and is "in house" at the sequencing centre, but has not been processed yet',
      2,
   ),
   pipelineStep(
      'Data Generation',
      GOAT_STATUS_LABELS['Data Generation'],
      'Sequencing data are currently being generated for the species',
      3,
   ),
   pipelineStep(
      'In Assembly',
      GOAT_STATUS_LABELS['In Assembly'],
      'All sequencing and related data have been collected and genome assembly is in process',
      4,
   ),
   pipelineStep(
      'INSDC Submitted',
      GOAT_STATUS_LABELS['INSDC Submitted'],
      "The species' genome assembly has been submitted to INSDC and is openly accessible under the generating project's Bioproject ID",
      5,
   ),
   pipelineStep(
      'Publication Available',
      GOAT_STATUS_LABELS['Publication Available'],
      'Assembly has an associated publication with a DOI or PubMed ID',
      6,
   ),
]

export const INSDC_PIPELINE_STEPS: StatusPipelineStep[] = [
   pipelineStep(
      'No Entry',
      INSDC_STATUS_LABELS['No Entry'],
      INSDC_COUNT_FILTER_DESCRIPTIONS.none,
      0,
   ),
   pipelineStep(
      'Biosample Submitted',
      INSDC_STATUS_LABELS['Biosample Submitted'],
      INSDC_COUNT_FILTER_DESCRIPTIONS.bio,
      1,
   ),
   pipelineStep(
      'Reads Submitted',
      INSDC_STATUS_LABELS['Reads Submitted'],
      INSDC_COUNT_FILTER_DESCRIPTIONS.reads,
      2,
   ),
   pipelineStep(
      'Assemblies Submitted',
      INSDC_STATUS_LABELS['Assemblies Submitted'],
      INSDC_COUNT_FILTER_DESCRIPTIONS.asm,
      3,
   ),
   pipelineStep(
      'Annotation Completed',
      INSDC_STATUS_LABELS['Annotation Completed'],
      INSDC_COUNT_FILTER_DESCRIPTIONS.ann,
      4,
   ),
]

export const TARGET_LIST_PIPELINE_STEPS: StatusPipelineStep[] = TARGET_LIST_STATUS_VALUES.map((v, i) =>
   pipelineStep(
      v,
      TARGET_LIST_STATUS_LABELS[v] ?? v,
      v === 'No Entry'
         ? 'Species not flagged on a formal target list.'
         : v === 'long_list'
           ? 'Any species declared as a target for the total scale of the project. For regional projects, this would declare that the species is known to be part of the biota of a region that is the target of this particular project (e.g. for DToL this is all UKSI plus the Irish biota, 72,000 species). For taxonomically-focussed species this would be all the species that are assigned to a particular higher taxon (e.g for VGP the long list is all 70,000 vertebrate species)'
           : v === 'family_representative'
             ? 'The species has been chosen as a family reference species for the organisation or project. These family representatives drive completion of the Earth BioGenome Project’s Phase 1 goals. Species tagged as “family_representative” will also receive a long_list tag on GoaT'
             : 'A species that has been prioritised by a project for reasons other than being  a family representative. This could include for example species of primary conservation interest, species that are part of pilot projects, species that address goals beyond the EBP Phase 1 family representatives, and other subprojects. Species tagged as “other_priority” will also receive a long_list tag on GoaT.',
      i % PIPELINE_SWATCH_CLASSES.length,
   ),
)

export type StatusTrackerDimension = 'goat' | 'insdc' | 'target_list'

export function labelGoatStatus(value: unknown): string {
   if (value == null || value === '') return ''
   const s = String(value)
   return GOAT_STATUS_LABELS[s] ?? s
}

export function labelInsdcStatus(value: unknown): string {
   if (value == null || value === '') return ''
   const s = String(value)
   return INSDC_STATUS_LABELS[s] ?? s
}

export function labelTargetListStatus(value: unknown): string {
   if (value == null || value === '') return ''
   const s = String(value)
   return TARGET_LIST_STATUS_LABELS[s] ?? s
}

function rowCount(row: Record<string, unknown>, key: string): number {
   const v = row[key]
   if (typeof v === 'number' && Number.isFinite(v)) return v
   return 0
}

/** Whether an INSDC ladder chip should appear “filled” from catalog counts (not `insdc_status`). */
export function insdcStepLitFromCounts(row: Record<string, unknown>, stepValue: string): boolean {
   const bio = rowCount(row, 'biosamples_count')
   const reads = rowCount(row, 'reads_count')
   const asm = rowCount(row, 'assemblies_count')
   const ann = rowCount(row, 'genome_annotations_count')
   switch (stepValue) {
      case 'No Entry':
         return bio === 0 && reads === 0 && asm === 0 && ann === 0
      case 'Biosample Submitted':
         return bio > 0
      case 'Reads Submitted':
         return reads > 0
      case 'Assemblies Submitted':
         return asm > 0
      case 'Annotation Completed':
         return ann > 0
      default:
         return false
   }
}

export function goatStatusRank(goatStatus: string): number {
   const i = GOAT_STATUS_VALUES.indexOf(goatStatus as (typeof GOAT_STATUS_VALUES)[number])
   return i >= 0 ? i : 0
}

export type GoatChipState = 'completed' | 'current' | 'todo'

export function goatChipState(stepIndex: number, currentRank: number): GoatChipState {
   if (stepIndex < currentRank) return 'completed'
   if (stepIndex === currentRank) return 'current'
   return 'todo'
}
