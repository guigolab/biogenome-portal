import type { AppConfig, ConfigModel, DataModels, PortalChartConfig, PortalConfig } from '../data/types'
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
   }
}
