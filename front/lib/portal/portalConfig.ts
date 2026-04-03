import type {
   AppConfig,
   ConfigFilter,
   ConfigModel,
   ConfigModelWire,
   DataModels,
   GeneralConfig,
   OrganismFormStepDef,
   OrganismFormStepId,
   PortalChartConfig,
   PortalConfig,
} from './types'
import { defaultInsdcCatalogModels } from './catalogModelsDefaults'
import { dataModels } from './types'

export const DEFAULT_VUESTIC_UI_BASE: Record<string, unknown> = {
   breakpoint: {
      enabled: true,
      bodyClass: true,
      thresholds: {
         xs: 0,
         sm: 320,
         md: 640,
         lg: 1024,
         xl: 1440,
      },
   },
   components: {
      VaInput: { color: 'textPrimary' },
      VaTextarea: { color: 'textPrimary' },
      VaSelect: { color: 'textPrimary' },
      VaStepper: { color: 'textPrimary' },
      VaChip: { preset: 'primary' },
      VaCheckbox: { color: 'textPrimary' },
      VaDateInput: { color: 'textPrimary' },
      VaModal: { closeButton: true, hideDefaultActions: true },
   },
   colors: {
      variables: {
         primary: '#2f2f2f',
         secondary: '#1f3a5f',
         accent: '#64748b',
      },
   },
}

/** Merge portal `theme.colors` into `colors.variables` (flat keys + legacy `variables` object). */
function mergeThemeColorVariables(
   rawTheme: PortalConfig['theme'],
   baseVariables: Record<string, string>,
): { variables: Record<string, string> } {
   const c = rawTheme?.colors as Record<string, unknown> | undefined
   if (!c) {
      return { variables: { ...baseVariables } }
   }
   let merged = { ...baseVariables }
   const legacy = c.variables
   if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
      merged = { ...merged, ...(legacy as Record<string, string>) }
   }
   for (const [k, v] of Object.entries(c)) {
      if (k === 'variables') continue
      if (typeof v === 'string') {
         merged[k] = v
      }
   }
   if (!merged.accent && merged.secondary) {
      merged.accent = merged.secondary
   }
   return { variables: merged }
}

export function portalJsonUrl(): string {
   const base = process.env.NEXT_PUBLIC_BASE_PATH || ''
   const normalized = base.endsWith('/') ? base.slice(0, -1) : base
   const path = normalized ? `${normalized}/portal.json` : '/portal.json'
   if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${path}`
   }
   return path
}

export async function fetchPortalConfig(): Promise<PortalConfig> {
   const res = await fetch(portalJsonUrl(), {
      credentials: 'same-origin',
   })
   if (!res.ok) {
      throw new Error(`portal.json: ${res.status} ${res.statusText}`)
   }
   return res.json() as Promise<PortalConfig>
}

function defaultChartSize(type: string): number {
   return type === 'dateline' ? 4 : 2
}

const INSDC_ORGANISM_FILTERS: ConfigFilter[] = [{ key: 'insdc_status', type: 'select' }]
const INSDC_ORGANISM_STATUS_COLUMNS = ['insdc_status'] as const
const INSDC_ORGANISM_CHARTS_WIRE: NonNullable<ConfigModelWire['charts']> = [
   { field: 'insdc_status', type: 'pie', size: 2 },
]

const GOAT_ORGANISM_FILTERS: ConfigFilter[] = [
   { key: 'goat_status', type: 'select' },
   { key: 'target_list_status', type: 'select' },
]
const GOAT_ORGANISM_STATUS_COLUMNS = ['goat_status', 'target_list_status'] as const
const GOAT_ORGANISM_CHARTS_WIRE: NonNullable<ConfigModelWire['charts']> = [
   { field: 'goat_status', type: 'pie', size: 2 },
   { field: 'target_list_status', type: 'pie', size: 2 },
]

function ensureTaxonColumns(columns: string[] | undefined): string[] {
   const rest = (columns ?? []).filter((c) => c !== 'scientific_name' && c !== 'taxid')
   return ['scientific_name', 'taxid', ...rest]
}

function injectInsdcOrganismModel(raw: ConfigModelWire): ConfigModelWire {
   const filters = [...(raw.filters ?? [])]
   const filterKeys = new Set(filters.map((f) => f.key))
   for (const f of INSDC_ORGANISM_FILTERS) {
      if (!filterKeys.has(f.key)) {
         filters.push(f)
         filterKeys.add(f.key)
      }
   }
   const columns = [...(raw.columns ?? [])]
   const colSet = new Set(columns)
   for (const k of INSDC_ORGANISM_STATUS_COLUMNS) {
      if (!colSet.has(k)) {
         columns.push(k)
         colSet.add(k)
      }
   }
   const charts = [...(raw.charts ?? [])]
   const chartFields = new Set(charts.map((c) => c.field))
   for (const ch of INSDC_ORGANISM_CHARTS_WIRE) {
      if (!chartFields.has(ch.field)) {
         charts.push({ ...ch })
         chartFields.add(ch.field)
      }
   }
   return { ...raw, filters, columns, charts }
}

function injectGoatOrganismModel(raw: ConfigModelWire): ConfigModelWire {
   const filters = [...(raw.filters ?? [])]
   const filterKeys = new Set(filters.map((f) => f.key))
   for (const f of GOAT_ORGANISM_FILTERS) {
      if (!filterKeys.has(f.key)) {
         filters.push(f)
         filterKeys.add(f.key)
      }
   }
   const columns = [...(raw.columns ?? [])]
   const colSet = new Set(columns)
   for (const k of GOAT_ORGANISM_STATUS_COLUMNS) {
      if (!colSet.has(k)) {
         columns.push(k)
         colSet.add(k)
      }
   }
   const charts = [...(raw.charts ?? [])]
   const chartFields = new Set(charts.map((c) => c.field))
   for (const ch of GOAT_ORGANISM_CHARTS_WIRE) {
      if (!chartFields.has(ch.field)) {
         charts.push({ ...ch })
         chartFields.add(ch.field)
      }
   }
   return { ...raw, filters, columns, charts }
}

export type NormalizeModelsOptions = {
   goatEnabled?: boolean
   insdcStatus?: boolean
}

export function normalizeModelsForApp(
   models: PortalConfig['models'],
   options: NormalizeModelsOptions = {},
): Partial<Record<DataModels, ConfigModel>> {
   const { goatEnabled = false, insdcStatus = false } = options
   const mergedWire: PortalConfig['models'] = {
      ...defaultInsdcCatalogModels,
      ...models,
   }
   const out: Partial<Record<DataModels, ConfigModel>> = {}
   for (const key of dataModels) {
      let raw = mergedWire[key]
      if (!raw) continue
      if (key === 'organisms') {
         if (insdcStatus) {
            raw = injectInsdcOrganismModel(raw)
         }
         if (goatEnabled) {
            raw = injectGoatOrganismModel(raw)
         }
      }
      const label = raw.label ?? raw.title ?? { en: key }
      const charts: PortalChartConfig[] = (raw.charts ?? []).map((c) => ({
         field: c.field,
         type: c.type,
         size: c.size ?? defaultChartSize(c.type),
      }))
      out[key] = {
         label,
         description: raw.description,
         filters: raw.filters,
         columns: ensureTaxonColumns(raw.columns),
         charts,
         ...(raw.icon !== undefined ? { icon: raw.icon } : {}),
      }
   }
   return out
}

const STEP_DEFAULTS: Record<
   OrganismFormStepId,
   { title: Record<string, string>; description: Record<string, string>; required: boolean; fixed: boolean }
> = {
   selectOrganism: {
      title: { en: 'Select organism' },
      description: { en: 'Search NCBI / EBI taxonomy and pick the species you want to register.' },
      required: true,
      fixed: true,
   },
   goatStatus: {
      title: { en: 'GoaT status' },
      description: { en: 'Sequencing pipeline stage and target-list classification for EBP / GoaT reporting.' },
      required: false,
      fixed: false,
   },
   sequencingAndSubproject: {
      title: { en: 'Sequencing & sub-project' },
      description: { en: 'Sequencing technologies planned or completed, and the sub-project code.' },
      required: true,
      fixed: true,
   },
   piOrEntity: {
      title: { en: 'PI or entity' },
      description: { en: 'Sub-project, principal investigator, or responsible organisation for this record.' },
      required: false,
      fixed: false,
   },
   images: {
      title: { en: 'Images' },
      description: { en: 'Attributed organism images (required when step is mandatory).' },
      required: false,
      fixed: false,
   },
   publications: {
      title: { en: 'Publications' },
      description: { en: 'DOI, PubMed ID, or PubMed Central ID references related to this organism.' },
      required: false,
      fixed: true,
   },
   vernacularNames: {
      title: { en: 'Vernacular names' },
      description: { en: 'Common names with language and locality.' },
      required: false,
      fixed: true,
   },
   extraMetadata: {
      title: { en: 'Extra metadata' },
      description: { en: 'Custom key–value attributes stored alongside the organism record.' },
      required: false,
      fixed: true,
   },
   reviewSubmit: {
      title: { en: 'Review & submit' },
      description: { en: 'Review all fields and submit the organism record.' },
      required: true,
      fixed: true,
   },
}

const STEP_ORDER: OrganismFormStepId[] = [
   'selectOrganism',
   'goatStatus',
   'sequencingAndSubproject',
   'piOrEntity',
   'images',
   'publications',
   'vernacularNames',
   'extraMetadata',
   'reviewSubmit',
]

export function resolveOrganismFormSteps(raw: PortalConfig): OrganismFormStepDef[] {
   const org = raw.cms?.organisms
   const requiredStepsPortal = org?.requiredSteps ?? org?.form?.requiredSteps
   const configSteps = org?.steps ?? org?.form?.steps ?? []
   const useRequiredStepsList = Array.isArray(requiredStepsPortal)

   const configMap = new Map<OrganismFormStepId, (typeof configSteps)[number]>(
      configSteps.map((s) => [s.id as OrganismFormStepId, s]),
   )

   return STEP_ORDER.map((id) => {
      const defaults = STEP_DEFAULTS[id]
      const override = configMap.get(id)

      const required = useRequiredStepsList
         ? requiredStepsPortal.includes(id)
            ? true
            : defaults.required
         : override?.required ?? defaults.required

      return {
         id,
         title: defaults.title,
         description: defaults.description,
         required,
         enabled: true,
         fixed: defaults.fixed,
      }
   })
}

function migrateEsCtKeysToCat(value: unknown): unknown {
   if (value === null || value === undefined) return value
   if (Array.isArray(value)) return value.map(migrateEsCtKeysToCat)
   if (typeof value !== 'object') return value
   const out: Record<string, unknown> = {}
   for (const [k, v] of Object.entries(value)) {
      const nk = k === 'es-ct' ? 'cat' : k
      out[nk] = migrateEsCtKeysToCat(v)
   }
   return out
}

function normalizeGeneralLanguages(raw: unknown): string[] {
   if (!Array.isArray(raw)) return []
   return raw
      .map((item) => {
         if (typeof item === 'string') return item === 'es-ct' ? 'cat' : item
         if (
            item &&
            typeof item === 'object' &&
            'code' in item &&
            typeof (item as { code: unknown }).code === 'string'
         ) {
            const c = (item as { code: string }).code
            return c === 'es-ct' ? 'cat' : c
         }
         return ''
      })
      .filter(Boolean)
}

export function normalizePortalConfig(
   raw: PortalConfig,
   normalizeColors: (ui: Record<string, unknown>) => Record<string, unknown>,
): AppConfig {
   const baseColors = DEFAULT_VUESTIC_UI_BASE.colors as {
      variables: Record<string, string>
   }
   const mergedColors = mergeThemeColorVariables(raw.theme, baseColors.variables)

   const uiRaw = {
      ...DEFAULT_VUESTIC_UI_BASE,
      colors: mergedColors,
   } as Record<string, unknown>

   const general = migrateEsCtKeysToCat(raw.general ?? {}) as GeneralConfig
   const models = migrateEsCtKeysToCat(raw.models ?? {}) as PortalConfig['models']
   const goatEnabled = general.goat === true
   const insdcStatus = general.insdcStatus === true
   return {
      general: {
         ...general,
         map: general.map !== false,
         languages: normalizeGeneralLanguages(general.languages),
      },
      ui: normalizeColors(uiRaw),
      models: normalizeModelsForApp(models ?? {}, { goatEnabled, insdcStatus }),
      organismFormSteps: resolveOrganismFormSteps(raw),
   }
}

export function getPortalAppearance(raw: PortalConfig): 'light' | 'dark' | 'system' {
   const fromTheme = raw.theme?.appearance
   const g = raw.general as { appearance?: string }
   const fromGeneral = g?.appearance
   const v = fromTheme ?? fromGeneral ?? 'system'
   if (v === 'light' || v === 'dark' || v === 'system') return v
   return 'system'
}
