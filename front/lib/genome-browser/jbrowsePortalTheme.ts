import { formatHex, interpolate, parse } from 'culori'

import type { AppConfig, PortalConfig } from '@/lib/portal/types'
import { pickBrandHexes } from '@/lib/portal/themeApply'

function mixToward(hex: string, target: string, t: number): string {
   const a = parse(hex)
   const b = parse(target)
   if (!a || !b) return hex
   const mix = interpolate([a, b], 'oklch')
   return formatHex(mix(t)) ?? hex
}

/** WCAG-style contrast text on solid `main` (hex). */
function contrastTextForMain(mainHex: string): string {
   const c = parse(mainHex)
   if (!c || c.mode !== 'rgb') return '#ffffff'
   const r = 'r' in c ? (c as { r: number }).r : 0
   const g = 'g' in c ? (c as { g: number }).g : 0
   const b = 'b' in c ? (c as { b: number }).b : 0
   const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
   return luminance > 0.55 ? '#0f172a' : '#ffffff'
}

function muiSlot(hex: string) {
   const main = hex.startsWith('#') ? hex : `#${hex}`
   return {
      main,
      light: mixToward(main, '#ffffff', 0.38),
      dark: mixToward(main, '#0f172a', 0.28),
      contrastText: contrastTextForMain(main),
   }
}

/**
 * JBrowse 2 root `configuration.theme` using portal.json brand colors and effective UI mode.
 * Pass `mode` from `resolvePortalUiMode` (persisted appearance + next-themes).
 */
export function buildJBrowseRootConfiguration(
   config: AppConfig | null,
   raw: PortalConfig | null | undefined,
   mode: 'light' | 'dark',
): Record<string, unknown> {
   const app = config ?? ({} as AppConfig)
   const { primary, secondary, accent } = pickBrandHexes(app, raw ?? null)

   return {
      rpc: {
         defaultDriver: 'WebWorkerRpcDriver',
      },
      theme: {
         palette: {
            mode,
            primary: muiSlot(primary),
            secondary: muiSlot(secondary),
            tertiary: muiSlot(accent),
            quaternary: muiSlot(mixToward(secondary, primary, 0.35)),
            ...(mode === 'dark'
               ? {
                    background: { default: '#0f172a', paper: '#1e293b' },
                    divider: 'rgba(148, 163, 184, 0.2)',
                    text: { primary: '#f1f5f9', secondary: '#94a3b8' },
                 }
               : {
                    background: { default: '#f8fafc', paper: '#ffffff' },
                    divider: 'rgba(15, 23, 42, 0.12)',
                    text: { primary: '#0f172a', secondary: '#475569' },
                 }),
         },
      },
   }
}
