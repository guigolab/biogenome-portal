export type ChartType = 'pie' | 'dateline' | 'bar'

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
}

/** Wire format for portal.json theme colors (appearance is user-controlled in the Next app, not JSON). */
export interface PortalTheme {
   colors: Record<string, string | Record<string, string>>
}

export type PortalChartConfig = {
   field: string
   type: ChartType
   size: number
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
   type: 'date' | 'select' | 'checkbox' | 'input'
   /** Short label in portal locales (falls back to a humanized key in the UI). */
   label?: Record<string, string>
}

export type ConfigModelWire = {
   label?: Record<string, string>
   title?: Record<string, string>
   description?: Record<string, string>
   icon?: string
   filters?: ConfigFilter[]
   columns?: string[]
   charts?: Array<{
      field: string
      type: ChartType
      size?: number
      model?: string
   }>
}

/**
 * Optional overrides for `models.local_samples` in portal.json only (other catalog models are code-defined).
 * Use string[] for `filters` / `charts` to pick entries from code defaults (by key / field);
 * unknown filter keys become `{ key, type: 'select' }`; unknown chart fields use `bar` size 2.
 */
export type PortalCatalogModelWire = {
   label?: Record<string, string>
   title?: Record<string, string>
   description?: Record<string, string>
   icon?: string
   filters?: string[] | ConfigFilter[]
   columns?: string[]
   charts?: string[] | Array<{ field: string; type?: ChartType; size?: number; model?: string }>
}

/** Only `local_samples` may be configured via portal.json; other keys are ignored at runtime. */
export type PortalModelsWire = {
   local_samples?: PortalCatalogModelWire
}

/** Home page footer: optional i18n lines and optional logo path under `public/`. */
export type PortalFooterWire = {
   copyright?: Record<string, string>
   tagline?: Record<string, string>
   /** Public path (e.g. `/portal-logo.svg`). Omit or empty to hide the footer logo. */
   logoUrl?: string
}

export type PortalConfig = {
   general: GeneralConfig
   theme?: PortalTheme
   /** Optional `local_samples` overrides; organisms and annotations use code defaults. */
   models?: PortalModelsWire
   cms?: PortalCmsWire
   footer?: PortalFooterWire
}

export type ConfigModel = {
   label: Record<string, string>
   description?: Record<string, string>
   icon?: string
   filters?: ConfigFilter[]
   columns?: string[]
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
