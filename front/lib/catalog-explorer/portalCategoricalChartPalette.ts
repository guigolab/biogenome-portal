import { converter, formatCss, parse } from 'culori'

import type { DataModels } from '@/lib/portal/types'

const toOklch = converter('oklch')

/** Max distinct categorical colors for catalog pie / bar / scatter (distinct hues around primary). */
export const PORTAL_CATEGORICAL_PALETTE_SIZE = 30

function clamp(n: number, min: number, max: number): number {
   return Math.min(max, Math.max(min, n))
}

/**
 * Builds {@link PORTAL_CATEGORICAL_PALETTE_SIZE} distinct OKLCH colors by rotating hue
 * around the primary color’s anchor (chroma/lightness adapted for readable charts).
 * Line and area series should use `var(--primary)` instead — not this palette.
 */
export function buildPortalCategoricalChartPalette(primaryHex: string): readonly string[] {
   const parsed = parse(primaryHex.trim())
   if (!parsed) return fallbackHueWheel()

   const base = toOklch(parsed)
   const L0 = typeof base.l === 'number' ? base.l : 0.62
   const rawC = typeof base.c === 'number' ? base.c : 0
   const C0 = rawC > 0.04 ? rawC : 0.19
   const h0 = typeof base.h === 'number' && Number.isFinite(base.h) ? base.h : 145

   const n = PORTAL_CATEGORICAL_PALETTE_SIZE
   const out: string[] = []

   for (let i = 0; i < n; i++) {
      const h = (h0 + (i * 360) / n) % 360
      const wave = Math.sin((i / n) * Math.PI * 2)
      const L = clamp(L0 + 0.05 * wave, 0.45, 0.76)
      const cWave = 0.85 + 0.12 * Math.abs(Math.cos((i / n) * Math.PI * 4))
      const c = clamp(C0 * cWave, 0.09, 0.3)
      out.push(formatCss({ mode: 'oklch', l: L, c, h }))
   }

   return out
}

function fallbackHueWheel(): readonly string[] {
   return Array.from({ length: PORTAL_CATEGORICAL_PALETTE_SIZE }, (_, i) =>
      formatCss({
         mode: 'oklch',
         l: 0.62,
         c: 0.19,
         h: (i * 360) / PORTAL_CATEGORICAL_PALETTE_SIZE,
      }),
   )
}

/** Rotate palette start per catalog so adjacent dashboards don’t look identical. */
export function catalogPaletteOffset(model: DataModels): number {
   switch (model) {
      case 'assemblies':
         return 0
      case 'biosamples':
         return 3
      case 'reads':
         return 5
      case 'annotations':
         return 2
      default:
         return 0
   }
}

/** Categorical fill for pie / bar / scatter (not line/area — use `var(--primary)` there). */
export function catalogCategoricalColor(
   model: DataModels,
   index: number,
   palette: readonly string[],
): string {
   const n = palette.length
   if (n === 0) return 'var(--muted-foreground)'
   return palette[(index + catalogPaletteOffset(model)) % n]!
}
