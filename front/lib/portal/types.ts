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
   appearance?: 'light' | 'dark' | 'system'
   /**
    * REST API prefix for browser and server fetches: absolute URL (`https://host/api`)
    * or same-origin path (`/api`, `/bgp/api`). Trailing slash is stripped when used.
    */
   apiBase?: string
   /** Default root taxid for UI fallbacks; prefer GET /taxons/root when online. */
   rootTaxid?: string
}

/** Wire format for portal.json theme (extends with accent + appearance). */
export interface PortalTheme {
   appearance?: 'light' | 'dark' | 'system'
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

export type PortalConfig = {
   general: GeneralConfig
   theme?: PortalTheme
   models: Partial<Record<DataModels, ConfigModelWire>>
   cms?: PortalCmsWire
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
}
