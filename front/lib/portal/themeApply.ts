import type { CSSProperties } from 'react'
import { converter, formatCss, parse } from 'culori'

import type { AppConfig, PortalConfig } from './types'

const toOklch = converter('oklch')

function hexToOklchString(hex: string): string {
   const c = parse(hex)
   if (!c) return 'oklch(0.5 0.05 250)'
   return formatCss(toOklch(c))
}

/** Pick readable foreground (light or dark) for text on a solid primary-like background. */
function foregroundForBackground(hex: string): string {
   const c = parse(hex)
   if (!c || c.mode !== 'rgb') return 'oklch(0.985 0 0)'
   const r = 'r' in c ? (c as { r: number }).r : 0
   const g = 'g' in c ? (c as { g: number }).g : 0
   const b = 'b' in c ? (c as { b: number }).b : 0
   const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
   return luminance > 0.55 ? 'oklch(0.145 0 0)' : 'oklch(0.985 0 0)'
}

/**
 * Brand hex for shadcn tokens: prefer literal `portal.json` `theme.colors` so UI matches the file.
 * `normalizeUiColors` desaturates heavily for legacy Vuestic-style variables — those look “untinted” on buttons.
 */
export function pickBrandHexes(
   config: AppConfig,
   raw: PortalConfig | null | undefined,
): { primary: string; secondary: string; accent: string } {
   const vars = (config.ui?.colors as { variables?: Record<string, string> } | undefined)?.variables ?? {}
   let primary = vars.primary || '#2f2f2f'
   let secondary = vars.secondary || '#1f3a5f'
   let accent = vars.accent || secondary

   const tc = raw?.theme?.colors as Record<string, unknown> | undefined
   if (tc) {
      const p = tc.primary
      const s = tc.secondary
      const a = tc.accent
      if (typeof p === 'string' && p.trim()) primary = p.trim()
      if (typeof s === 'string' && s.trim()) secondary = s.trim()
      if (typeof a === 'string' && a.trim()) accent = a.trim()
      else accent = secondary
   }

   return { primary, secondary, accent }
}

function applyBrandHexesToRoot(
   root: HTMLElement | null,
   primary: string,
   secondary: string,
   accent: string,
): void {
   if (!root) return

   const primaryOklch = hexToOklchString(primary)
   const secondaryOklch = hexToOklchString(secondary)
   const accentOklch = hexToOklchString(accent)

   root.style.setProperty('--primary', primaryOklch)
   root.style.setProperty('--primary-foreground', foregroundForBackground(primary))
   root.style.setProperty('--secondary', secondaryOklch)
   root.style.setProperty('--secondary-foreground', foregroundForBackground(secondary))
   root.style.setProperty('--accent', accentOklch)
   root.style.setProperty('--accent-foreground', foregroundForBackground(accent))
   root.style.setProperty('--ring', primaryOklch)
   root.style.setProperty('--chart-1', primaryOklch)
   root.style.setProperty('--chart-2', accentOklch)
   root.style.setProperty('--chart-3', secondaryOklch)
   root.style.setProperty(
      '--chart-4',
      `color-mix(in oklch, ${primaryOklch} 55%, ${accentOklch})`,
   )
   root.style.setProperty(
      '--chart-5',
      `color-mix(in oklch, ${secondaryOklch} 50%, ${accentOklch})`,
   )
   root.style.setProperty(
      '--chart-6',
      `color-mix(in oklch, ${primaryOklch} 50%, ${secondaryOklch})`,
   )
   root.style.setProperty('--sidebar-primary', primaryOklch)
   root.style.setProperty('--sidebar-primary-foreground', foregroundForBackground(primary))
   root.style.setProperty('--sidebar-ring', primaryOklch)
}

/** Server / RSC: inline style for `<html>` so first paint uses portal theme (not only after client fetch). */
export function portalThemeStyleProps(
   config: AppConfig,
   raw: PortalConfig | null | undefined,
): CSSProperties {
   const { primary, secondary, accent } = pickBrandHexes(config, raw)
   const primaryOklch = hexToOklchString(primary)
   const secondaryOklch = hexToOklchString(secondary)
   const accentOklch = hexToOklchString(accent)

   return {
      ['--primary' as string]: primaryOklch,
      ['--primary-foreground' as string]: foregroundForBackground(primary),
      ['--secondary' as string]: secondaryOklch,
      ['--secondary-foreground' as string]: foregroundForBackground(secondary),
      ['--accent' as string]: accentOklch,
      ['--accent-foreground' as string]: foregroundForBackground(accent),
      ['--ring' as string]: primaryOklch,
      ['--chart-1' as string]: primaryOklch,
      ['--chart-2' as string]: accentOklch,
      ['--chart-3' as string]: secondaryOklch,
      ['--chart-4' as string]: `color-mix(in oklch, ${primaryOklch} 55%, ${accentOklch})`,
      ['--chart-5' as string]: `color-mix(in oklch, ${secondaryOklch} 50%, ${accentOklch})`,
      ['--chart-6' as string]: `color-mix(in oklch, ${primaryOklch} 50%, ${secondaryOklch})`,
      ['--sidebar-primary' as string]: primaryOklch,
      ['--sidebar-primary-foreground' as string]: foregroundForBackground(primary),
      ['--sidebar-ring' as string]: primaryOklch,
   } as CSSProperties
}

/**
 * Maps portal brand colors onto shadcn semantic tokens (oklch CSS variables).
 * Pass `raw` from `portal.json` so `theme.colors` match the file (see `pickBrandHexes`).
 */
export function applyPortalThemeToDocument(
   root: HTMLElement,
   config: AppConfig,
   raw?: PortalConfig | null,
): void {
   const vars = (config.ui?.colors as { variables?: Record<string, string> } | undefined)?.variables
   if (!vars) return

   const { primary, secondary, accent } = pickBrandHexes(config, raw ?? null)
   applyBrandHexesToRoot(root, primary, secondary, accent)
}

export function clearPortalThemeInlineStyles(root: HTMLElement): void {
   const keys = [
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--accent',
      '--accent-foreground',
      '--ring',
      '--chart-1',
      '--chart-2',
      '--chart-3',
      '--chart-4',
      '--chart-5',
      '--chart-6',
      '--sidebar-primary',
      '--sidebar-primary-foreground',
      '--sidebar-ring',
   ]
   for (const k of keys) {
      root.style.removeProperty(k)
   }
}
