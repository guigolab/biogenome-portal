import type {
   AppConfig,
   ConfigModel,
   ConfigurableStepId,
   DataModels,
   OrganismFormStepDef,
   OrganismFormStepId,
   PortalChartConfig,
   PortalConfig,
} from '../data/types'
import { dataModels } from '../data/types'

/** Non-color Vuestic defaults (portal `theme` only carries `colors` per schema). */
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
      threshold: 100,
      variables: {
         primary: '#2f2f2f',
         secondary: '#1f3a5f',
      },
   },
}

/** Absolute URL to portal.json (same origin as the app). Avoids URL() quirks with path-only bases. */
export function portalJsonUrl(): string {
   let base = import.meta.env.BASE_URL || '/'
   if (!base.endsWith('/')) base += '/'
   const path = `${base}portal.json`
   if (typeof window !== 'undefined' && window.location?.origin) {
      return new URL(path, window.location.origin).href
   }
   return path
}

export async function fetchPortalConfig(): Promise<PortalConfig> {
   const res = await fetch(portalJsonUrl(), { credentials: 'same-origin' })
   if (!res.ok) {
      throw new Error(`portal.json: ${res.status} ${res.statusText}`)
   }
   return res.json() as Promise<PortalConfig>
}

function defaultChartSize(type: string): number {
   return type === 'dateline' ? 4 : 2
}

/** Ensure each model has `label` and charts have `size` (schema); strip redundant `model` on charts. */
export function normalizeModelsForApp(
   models: PortalConfig['models'],
): Partial<Record<DataModels, ConfigModel>> {
   const out: Partial<Record<DataModels, ConfigModel>> = {}
   for (const key of dataModels) {
      const raw = models[key]
      if (!raw) continue
      const label = raw.label ?? raw.title ?? { en: key }
      const charts: PortalChartConfig[] = (raw.charts ?? []).map((c) => ({
         field: c.field,
         type: c.type,
         size: c.size ?? defaultChartSize(c.type),
      }))
      out[key] = {
         ...raw,
         label,
         title: raw.title ?? label,
         description: raw.description,
         filters: raw.filters,
         columns: raw.columns,
         charts,
      }
   }
   return out
}

/** Default display properties for every step. */
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
      description: { en: 'Primary display image (required when step is mandatory) and optional gallery images.' },
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

/** Canonical order of all steps in the stepper. */
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

/**
 * Build the full ordered list of resolved step definitions from `portal.json` cms config.
 * Falls back to defaults when the cms block is absent or a step is not listed.
 */
export function resolveOrganismFormSteps(raw: PortalConfig): OrganismFormStepDef[] {
   const configSteps = raw.cms?.organisms?.form?.steps ?? []
   const configMap = new Map<ConfigurableStepId, (typeof configSteps)[number]>(
      configSteps.map((s) => [s.id, s]),
   )

   return STEP_ORDER.map((id) => {
      const defaults = STEP_DEFAULTS[id]
      const override = configMap.get(id as ConfigurableStepId)
      return {
         id,
         title: defaults.title,
         description: defaults.description,
         required: override?.required ?? defaults.required,
         enabled: override?.enabled ?? true,
         fixed: defaults.fixed,
      }
   })
}

export function normalizePortalConfig(
   raw: PortalConfig,
   normalizeUiColors: (ui: Record<string, any>) => Record<string, any>,
): AppConfig {
   const baseColors = DEFAULT_VUESTIC_UI_BASE.colors as {
      threshold?: number
      variables: Record<string, string>
   }
   const mergedColors = raw.theme?.colors
      ? {
           threshold: raw.theme.colors.threshold ?? baseColors.threshold,
           variables: { ...baseColors.variables, ...raw.theme.colors.variables },
        }
      : baseColors

   const uiRaw = {
      ...DEFAULT_VUESTIC_UI_BASE,
      colors: mergedColors,
   } as Record<string, any>

   return {
      general: raw.general ?? {},
      ui: normalizeUiColors(uiRaw),
      models: normalizeModelsForApp(raw.models ?? {}),
      organismFormSteps: resolveOrganismFormSteps(raw),
   }
}
