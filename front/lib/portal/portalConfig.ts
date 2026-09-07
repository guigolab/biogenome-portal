import type {
   AppConfig,
   CatalogCardFieldDef,
   CmsOrganismFieldWire,
   ConfigFilter,
   ConfigModel,
   ConfigModelWire,
   DataModels,
   GeneralConfig,
   OrganismFormStepDef,
   OrganismFormStepId,
   PortalCatalogModelWire,
   PortalChartConfig,
   PortalConfig,
   PortalFooterWire,
   PortalModelsWire,
} from './types'
import {
   defaultInsdcCatalogModels,
   defaultLocalSamplesCatalogWire,
   defaultOrganismCatalogWire,
   INSDC_CODE_ONLY_CATALOG_MODEL_KEYS,
} from '@/lib/catalog-models'
import { getApiBase } from '@/lib/api/taxon'
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

/**
 * Client fetch of backend-authoritative portal config (`GET {apiBase}/portal`).
 * Uses the same `getApiBase()` helper as taxons/etc., so it resolves correctly through every
 * proxy topology (dev nginx / Traefik root or subpath) — `${basePath}/api/*` already routes
 * to Flask everywhere. On failure, callers (e.g. `PortalProvider`) fall back to
 * `defaultPortalConfig`.
 */
export async function fetchPortalConfig(): Promise<PortalConfig> {
   const res = await fetch(`${getApiBase()}/portal`, {
      credentials: 'same-origin',
      cache: 'no-store',
   })
   if (!res.ok) {
      throw new Error(`portal: ${res.status} ${res.statusText}`)
   }
   return res.json() as Promise<PortalConfig>
}

function defaultChartSize(type: string): number {
   if (type === 'dateline' || type === 'scatter') return 4
   return 2
}

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

/** Prepends taxon fields for TSV/export field lists (same ordering as `ensureTaxonColumns`). */
function ensureTaxonExportFields(fields: string[] | undefined): string[] {
   const rest = (fields ?? []).filter((c) => c !== 'scientific_name' && c !== 'taxid')
   return ['scientific_name', 'taxid', ...rest]
}

/** Migration: derive minimal card field defs from legacy `columns` (body only; header uses taxon + id). */
function cardFieldsShimFromColumns(columns: string[]): CatalogCardFieldDef[] {
   return columns
      .filter((c) => c !== 'scientific_name' && c !== 'taxid')
      .map((key) => ({ key }))
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
   const exportFields = [...(raw.exportFields ?? raw.columns ?? [])]
   const exportSet = new Set(exportFields)
   for (const k of GOAT_ORGANISM_STATUS_COLUMNS) {
      if (!colSet.has(k)) {
         columns.push(k)
         colSet.add(k)
      }
      if (!exportSet.has(k)) {
         exportFields.push(k)
         exportSet.add(k)
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
   return { ...raw, filters, columns, exportFields, charts }
}

export type NormalizeModelsOptions = {
   goatEnabled?: boolean
}

function isStringArray(value: unknown): value is string[] {
   return Array.isArray(value) && value.every((x) => typeof x === 'string')
}

function resolveFiltersFromPortal(
   portal: PortalCatalogModelWire['filters'],
   base: ConfigFilter[],
): ConfigFilter[] {
   if (portal === undefined) return [...base]
   if (portal.length === 0) return []
   if (isStringArray(portal)) {
      const baseByKey = new Map(base.map((f) => [f.key, f]))
      return portal.map((key) => baseByKey.get(key) ?? { key, type: 'select' as const })
   }
   return [...portal]
}

function resolveChartsFromPortal(
   portal: PortalCatalogModelWire['charts'],
   base: NonNullable<ConfigModelWire['charts']>,
): NonNullable<ConfigModelWire['charts']> {
   if (portal === undefined) return [...base]
   if (portal.length === 0) return []
   if (isStringArray(portal)) {
      const baseByField = new Map(base.map((c) => [c.field, c]))
      return portal.map((field) => {
         const b = baseByField.get(field)
         if (b) return { ...b }
         return { field, type: 'bar' as const, size: defaultChartSize('bar') }
      })
   }
   return portal.map((c) => ({
      field: c.field,
      type: c.type ?? 'bar',
      size: c.size ?? defaultChartSize(c.type ?? 'bar'),
      ...(c.model !== undefined ? { model: c.model } : {}),
      ...(c.xField !== undefined ? { xField: c.xField } : {}),
      ...(c.yField !== undefined ? { yField: c.yField } : {}),
      ...(c.colorField !== undefined ? { colorField: c.colorField } : {}),
   }))
}

function mergeOverridableCatalogModel(base: ConfigModelWire, portal: PortalCatalogModelWire | undefined): ConfigModelWire {
   if (!portal) return { ...base }
   const filters = resolveFiltersFromPortal(portal.filters, base.filters ?? [])
   const charts = resolveChartsFromPortal(portal.charts, base.charts ?? [])
   const columns = portal.columns !== undefined ? [...portal.columns] : [...(base.columns ?? [])]
   const cardFields =
      portal.cardFields !== undefined ? [...portal.cardFields] : base.cardFields !== undefined ? [...base.cardFields] : undefined
   const sortableFields =
      portal.sortableFields !== undefined
         ? [...portal.sortableFields]
         : base.sortableFields !== undefined
           ? [...base.sortableFields]
           : undefined
   const exportFields =
      portal.exportFields !== undefined
         ? [...portal.exportFields]
         : base.exportFields !== undefined
           ? [...base.exportFields]
           : undefined
   return {
      ...base,
      label: portal.label ?? portal.title ?? base.label,
      title: portal.title ?? base.title,
      description: portal.description ?? base.description,
      ...(portal.icon !== undefined ? { icon: portal.icon } : {}),
      filters,
      columns,
      ...(cardFields !== undefined ? { cardFields } : {}),
      ...(sortableFields !== undefined ? { sortableFields } : {}),
      ...(exportFields !== undefined ? { exportFields } : {}),
      charts,
   }
}

export function normalizeModelsForApp(
   models: PortalModelsWire | undefined,
   options: NormalizeModelsOptions = {},
): Partial<Record<DataModels, ConfigModel>> {
   const { goatEnabled = false } = options
   const imported = models ?? {}

   const mergedWire: Partial<Record<DataModels, ConfigModelWire>> = {}
   for (const key of INSDC_CODE_ONLY_CATALOG_MODEL_KEYS) {
      mergedWire[key] = { ...defaultInsdcCatalogModels[key] }
   }
   mergedWire.annotations = mergeOverridableCatalogModel(
      defaultInsdcCatalogModels.annotations,
      imported.annotations,
   )

   let organismsWire: ConfigModelWire = { ...defaultOrganismCatalogWire }
   if (goatEnabled) {
      organismsWire = injectGoatOrganismModel(organismsWire)
   }
   mergedWire.organisms = organismsWire

   mergedWire.local_samples = mergeOverridableCatalogModel(
      defaultLocalSamplesCatalogWire,
      imported.local_samples,
   )

   const out: Partial<Record<DataModels, ConfigModel>> = {}
   for (const key of dataModels) {
      let raw = mergedWire[key]
      if (!raw) continue
      if (key === 'organisms') {
         if (goatEnabled) {
            raw = injectGoatOrganismModel(raw)
         }
      }
      const label = raw.label ?? raw.title ?? { en: key }
      const charts: PortalChartConfig[] = (raw.charts ?? []).map((c) => ({
         field: c.field,
         type: c.type,
         size: c.size ?? defaultChartSize(c.type),
         ...(c.xField !== undefined ? { xField: c.xField } : {}),
         ...(c.yField !== undefined ? { yField: c.yField } : {}),
         ...(c.colorField !== undefined ? { colorField: c.colorField } : {}),
      }))
      const cardFieldsResolved: CatalogCardFieldDef[] | undefined =
         raw.cardFields?.length
            ? raw.cardFields
            : raw.columns?.length
              ? cardFieldsShimFromColumns(raw.columns)
              : undefined
      const exportSource =
         raw.exportFields?.length ? raw.exportFields : raw.columns?.length ? raw.columns : undefined
      const exportFieldsResolved = exportSource?.length ? ensureTaxonExportFields(exportSource) : undefined
      out[key] = {
         label,
         description: raw.description,
         filters: raw.filters,
         ...(raw.columns?.length ? { columns: ensureTaxonColumns(raw.columns) } : {}),
         ...(cardFieldsResolved !== undefined ? { cardFields: cardFieldsResolved } : {}),
         ...(raw.sortableFields?.length ? { sortableFields: raw.sortableFields } : {}),
         ...(exportFieldsResolved !== undefined ? { exportFields: exportFieldsResolved } : {}),
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
      title: { en: 'Sequencing' },
      description: { en: 'Sequencing technologies planned or completed for this organism.' },
      required: false,
      fixed: true,
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

   const knownStepIds = new Set<string>(STEP_ORDER)
   const configMap = new Map<OrganismFormStepId, (typeof configSteps)[number]>(
      configSteps
         .filter((s) => knownStepIds.has(s.id))
         .map((s) => [s.id as OrganismFormStepId, s]),
   )

   const requiredStepsFiltered = useRequiredStepsList
      ? requiredStepsPortal.filter((id): id is OrganismFormStepId => knownStepIds.has(id))
      : undefined

   return STEP_ORDER.map((id) => {
      const defaults = STEP_DEFAULTS[id]
      const override = configMap.get(id)

      const required = useRequiredStepsList
         ? requiredStepsFiltered!.includes(id)
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

export function resolveOrganismCustomFields(raw: PortalConfig): CmsOrganismFieldWire[] {
   return raw.cms?.organisms?.fields ?? []
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
   const models = migrateEsCtKeysToCat(raw.models ?? {}) as PortalModelsWire
   const footerRaw = migrateEsCtKeysToCat(raw.footer ?? {}) as PortalFooterWire
   const footer = normalizeFooterWire(footerRaw)
   const goatEnabled = general.goat === true
   return {
      general: {
         ...general,
         map: general.map !== false,
         languages: normalizeGeneralLanguages(general.languages),
      },
      ui: normalizeColors(uiRaw),
      models: normalizeModelsForApp(models ?? {}, {
         goatEnabled,
      }),
      organismFormSteps: resolveOrganismFormSteps(raw),
      organismCustomFields: resolveOrganismCustomFields(raw),
      ...(footer ? { footer } : {}),
   }
}

function normalizeFooterWire(raw: PortalFooterWire): PortalFooterWire | undefined {
   const logoUrl =
      typeof raw.logoUrl === 'string' && raw.logoUrl.trim() ? raw.logoUrl.trim() : undefined
   const hasCopy = raw.copyright && Object.keys(raw.copyright).length > 0
   const hasTag = raw.tagline && Object.keys(raw.tagline).length > 0
   if (!hasCopy && !hasTag && !logoUrl) return undefined
   return {
      ...(hasCopy ? { copyright: raw.copyright } : {}),
      ...(hasTag ? { tagline: raw.tagline } : {}),
      ...(logoUrl ? { logoUrl } : {}),
   }
}

export type PortalAppearanceMode = 'light' | 'dark' | 'system'

/**
 * Effective light/dark for embedded UIs (JBrowse, map basemaps) from persisted appearance and next-themes.
 * `light` / `dark` lock the mode; `system` follows `resolvedTheme` from next-themes (OS preference).
 */
export function resolvePortalUiMode(
   appearance: PortalAppearanceMode,
   resolvedTheme: string | undefined,
): 'light' | 'dark' {
   if (appearance === 'light') return 'light'
   if (appearance === 'dark') return 'dark'
   return resolvedTheme === 'dark' ? 'dark' : 'light'
}
