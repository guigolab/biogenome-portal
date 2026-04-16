export type ChartType = 'pie' | 'dateline' | 'bar' | 'scatter'

export type ConfigurableStepId = 'goatStatus' | 'piOrEntity' | 'images'

export type OrganismFormStepId =
   | 'selectOrganism'
   | 'goatStatus'
   | 'sequencingAndSubproject'
   | 'piOrEntity'
   | 'images'
   | 'publications'
   | 'vernacularNames'
   | 'extraMetadata'
   | 'reviewSubmit'

export type CmsOrganismFormStepWire = {
   id: ConfigurableStepId
   required?: boolean
   enabled?: boolean
}

export type CmsOrganismFormWire = {
   requiredSteps?: OrganismFormStepId[]
   steps?: CmsOrganismFormStepWire[]
}

export type CmsOrganismsWire = {
   requiredSteps?: OrganismFormStepId[]
   steps?: CmsOrganismFormStepWire[]
   form?: CmsOrganismFormWire
}

export type PortalCmsWire = {
   organisms?: CmsOrganismsWire
}

export interface GeneralConfig extends Record<string, unknown> {
   /** When true, show CMS admin login in the main nav (`/login`). */
   cms?: boolean
   /**
    * Per-locale substring matched inside `title` (first occurrence, case-insensitive) and styled with primary color.
    */
   titleHighlight?: Record<string, string>
   /**
    * REST API prefix for browser and server fetches: absolute URL (`https://host/api`)
    * or same-origin path (`/api`, `/bgp/api`). Trailing slash is stripped when used.
    */
   apiBase?: string
   /** Default root taxid for UI fallbacks; prefer GET /taxons/root when online. */
   rootTaxid?: string
   /**
    * Optional `http`/`https` URL to this portal’s Genomes on a Tree (GoaT) project.
    * When set, the species list GoaT drawer shows a “View in GoaT” action.
    */
   goatProjectLink?: string
}

/** Wire format for portal.json theme colors (appearance is user-controlled in the Next app, not JSON). */
export interface PortalTheme {
   colors: Record<string, string | Record<string, string>>
}

export type PortalChartConfig = {
   field: string
   type: ChartType
   size: number
   /** Scatter charts: dot axes and series (catalog assemblies). */
   xField?: string
   yField?: string
   colorField?: string
}

export type DataModels =
   | 'biosamples'
   | 'reads'
   | 'organisms'
   | 'annotations'
   | 'assemblies'
   | 'local_samples'
   | 'submitted_biosamples'

export const dataModels: DataModels[] = [
   'biosamples',
   'reads',
   'organisms',
   'annotations',
   'assemblies',
   'local_samples',
]

export type ConfigFilter = {
   key: string
   type:
      | 'date'
      | 'select'
      | 'checkbox'
      | 'input'
      /** Distinct ordered string buckets + range slider → `__gte` / `__lte` (same as date). */
      | 'histogramDate'
      /** Paginated experiment picker (reads): sets `experiment_accession`. */
      | 'experimentList'
      /** Single checkbox: when checked, applies `key__gte` = `threshold`. */
      | 'thresholdToggle'
      /** One collapsible with multiple checkboxes; state lives under each `thresholdPair[].key`. */
      | 'thresholdPair'
      /** RefSeq reference genome: matches reference assemblies on `metadata.assembly_info.refseq_category`. */
      | 'referenceGenome'
   /**
    * Short label in portal locales (falls back to a humanized key in the UI).
    * Portal.json overrides may supply this; code-defined model filters use `labelKey` instead.
    */
   label?: Record<string, string>
   /**
    * Locale-context message key for the filter section title.
    * UI prefers `t(labelKey)` when no portal-provided `label` Record is present.
    */
   labelKey?: string
   /** Optional line under the section title (e.g. referenceGenome checkbox copy). */
   checkboxLabel?: Record<string, string>
   /** Message key for the optional checkbox sub-label (used alongside `checkboxLabel`). */
   checkboxLabelKey?: string
   /** Used with `thresholdToggle` (MongoEngine `__gte` value). */
   threshold?: number
   /** Used with `thresholdPair`: each row is a metadata path + threshold + optional per-row label. */
   thresholdPair?: { key: string; threshold: number; label?: Record<string, string>; labelKey?: string }[]
}

/** Dot-path field on a catalog row; optional Lucide icon name + section for card layout. */
export type CatalogCardFieldDef = {
   key: string
   label?: Record<string, string>
   /** Lucide icon name, e.g. `Calendar`, `MapPin` — resolved in the catalog card UI. */
   icon?: string
   /** Grouping for visual scanning (species-card–style sections). */
   section?: 'meta' | 'stats' | 'location' | 'identifiers' | 'annotation'
}

export type ConfigModelWire = {
   label?: Record<string, string>
   title?: Record<string, string>
   description?: Record<string, string>
   icon?: string
   filters?: ConfigFilter[]
   /** @deprecated Use cardFields + exportFields for list/export; kept for migration shims. */
   columns?: string[]
   /** Card body fields (list view). */
   cardFields?: CatalogCardFieldDef[]
   /** API `sort_column` keys offered in the catalog UI. */
   sortableFields?: string[]
   /** TSV/JSONL export field paths; taxon + id fields merged in normalize. */
   exportFields?: string[]
   charts?: Array<{
      field: string
      type: ChartType
      size?: number
      model?: string
      xField?: string
      yField?: string
      colorField?: string
   }>
}

/**
 * Optional overrides for `models.local_samples` and `models.annotations` in portal.json (card layout, labels).
 * Use string[] for `filters` / `charts` to pick entries from code defaults (by key / field);
 * unknown filter keys become `{ key, type: 'select' }`; unknown chart fields use `bar` size 2.
 */
export type PortalCatalogModelWire = {
   label?: Record<string, string>
   title?: Record<string, string>
   description?: Record<string, string>
   icon?: string
   filters?: string[] | ConfigFilter[]
   /** @deprecated Prefer cardFields + exportFields. */
   columns?: string[]
   cardFields?: CatalogCardFieldDef[]
   sortableFields?: string[]
   exportFields?: string[]
   charts?:
      | string[]
      | Array<{
           field: string
           type?: ChartType
           size?: number
           model?: string
           xField?: string
           yField?: string
           colorField?: string
        }>
}

/** Portal.json `models`: `local_samples` and optional `annotations` card/export overrides. */
export type PortalModelsWire = {
   local_samples?: PortalCatalogModelWire
   annotations?: PortalCatalogModelWire
}

/** Home page footer: optional i18n lines and optional logo path under `public/`. */
export type PortalFooterWire = {
   copyright?: Record<string, string>
   tagline?: Record<string, string>
   /** Public path (e.g. `/portal-logo.png`). Omit or empty for title-only navbar/footer. */
   logoUrl?: string
}

export type PortalConfig = {
   general: GeneralConfig
   theme?: PortalTheme
   /** Optional `local_samples` / `annotations` card layout overrides. */
   models?: PortalModelsWire
   cms?: PortalCmsWire
   footer?: PortalFooterWire
}

export type ConfigModel = {
   label: Record<string, string>
   description?: Record<string, string>
   icon?: string
   filters?: ConfigFilter[]
   /** @deprecated List UI uses cardFields. */
   columns?: string[]
   cardFields?: CatalogCardFieldDef[]
   sortableFields?: string[]
   exportFields?: string[]
   charts?: PortalChartConfig[]
}

export type OrganismFormStepDef = {
   id: OrganismFormStepId
   title: Record<string, string>
   description: Record<string, string>
   required: boolean
   enabled: boolean
   fixed: boolean
}

export interface AppConfig {
   general: GeneralConfig
   ui: Record<string, unknown>
   models: Partial<Record<DataModels, ConfigModel>>
   organismFormSteps: OrganismFormStepDef[]
   footer?: PortalFooterWire
}
