import { ref } from 'vue'
import type { AppConfig, PortalConfig } from '../data/types'
import defaultPortal from '../data/configs/portal.json'
import { fetchPortalConfig, normalizePortalConfig } from './portalConfig'

export function useAppSettings() {
   const configs = ref<AppConfig | null>(null)
   const error = ref<string | null>(null)

   const fetchSettings = async () => {
      let raw: PortalConfig
      try {
         raw = await fetchPortalConfig()
         error.value = null
      } catch (err) {
         error.value = (err as Error).message
         raw = defaultPortal as PortalConfig
      }
      configs.value = normalizePortalConfig(raw, normalizeUiColors)
   }

   return {
      configs,
      error,
      fetchSettings,
   }
}

type RGB = { r: number; g: number; b: number }

export function normalizeUiColors(ui: Record<string, any>): Record<string, any> {
   const baseVariables = (ui.colors?.variables ?? {}) as Record<string, string>
   const rawPrimary = normalizeHex(baseVariables.primary || '#2f2f2f')
   const rawSecondary = normalizeHex(baseVariables.secondary || darken(rawPrimary, 0.12))
   const primary = desaturate(rawPrimary, 0.72)
   const secondary = desaturate(rawSecondary, 0.72)
   const nav = secondary
   const info = normalizeHex(secondary)
   const iconPalette = buildIconPalette(primary, secondary)
   const statusPalette = buildStatusPalette(secondary)

   const generatedVariables = {
      ...baseVariables,
      primary,
      secondary,
      nav,
      navText: getReadableTextColor(nav),
      backgroundPrimary: mixHex('#ffffff', primary, 0.06),
      backgroundSecondary: mixHex('#ffffff', secondary, 0.03),
      backgroundElement: mixHex('#ffffff', primary, 0.015),
      backgroundBorder: mixHex('#cbd5e1', secondary, 0.22),
      danger: statusPalette.status0,
      warning: statusPalette.status2,
      success: statusPalette.status6,
      info,
      ...statusPalette,
      ...iconPalette,
   }

   return {
      ...ui,
      colors: {
         ...(ui.colors ?? {}),
         variables: generatedVariables,
      },
   }
}

function normalizeHex(hex: string): string {
   const cleaned = hex.trim().replace('#', '')
   if (cleaned.length === 3) {
      return `#${cleaned
         .split('')
         .map((c) => c + c)
         .join('')
         .toLowerCase()}`
   }
   if (cleaned.length !== 6) return '#2f2f2f'
   return `#${cleaned.toLowerCase()}`
}

function hexToRgb(hex: string): RGB {
   const value = normalizeHex(hex).slice(1)
   return {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16),
   }
}

function rgbToHex({ r, g, b }: RGB): string {
   const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
   return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mixHex(baseHex: string, mixWithHex: string, amount: number): string {
   const base = hexToRgb(baseHex)
   const mixWith = hexToRgb(mixWithHex)
   const clamped = Math.max(0, Math.min(1, amount))
   return rgbToHex({
      r: base.r + (mixWith.r - base.r) * clamped,
      g: base.g + (mixWith.g - base.g) * clamped,
      b: base.b + (mixWith.b - base.b) * clamped,
   })
}

function darken(hex: string, amount: number): string {
   return mixHex(hex, '#000000', amount)
}

function getReadableTextColor(bgHex: string): string {
   const { r, g, b } = hexToRgb(bgHex)
   const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
   return luminance > 0.6 ? '#111827' : '#ffffff'
}

function shiftHue(hex: string, degrees: number, saturation: number, lightness: number): string {
   const hsl = rgbToHsl(hexToRgb(hex))
   const hue = (hsl.h + degrees + 360) % 360
   return rgbToHex(hslToRgb(hue, saturation, lightness))
}

function desaturate(hex: string, amount: number): string {
   const hsl = rgbToHsl(hexToRgb(hex))
   const clamped = Math.max(0, Math.min(1, amount))
   const saturation = hsl.s * (1 - clamped)
   return rgbToHex(hslToRgb(hsl.h, saturation, hsl.l))
}

/**
 * Builds a status palette from reddish to greenish, complementary to primary/secondary.
 * Uses similar saturation/lightness to theme for harmony. Progress: 0=not started, 6=complete.
 */
function buildStatusPalette(secondaryHex: string): Record<string, string> {
   const secondaryHsl = rgbToHsl(hexToRgb(secondaryHex))
   const s = Math.min(0.7, secondaryHsl.s + 0.45)
   const l = 0.46
   return {
      status0: rgbToHex(hslToRgb(8, s, l)), // red - not started
      status1: rgbToHex(hslToRgb(25, s, l + 0.02)), // red-orange
      status2: rgbToHex(hslToRgb(38, s, l + 0.03)), // orange
      status3: rgbToHex(hslToRgb(55, s, l + 0.02)), // yellow-amber
      status4: rgbToHex(hslToRgb(85, s - 0.05, l)), // yellow-green
      status5: rgbToHex(hslToRgb(115, s - 0.1, l - 0.01)), // green
      status6: rgbToHex(hslToRgb(148, s - 0.15, l - 0.02)), // emerald - complete
   }
}

function buildIconPalette(primaryHex: string, secondaryHex: string): Record<string, string> {
   const primaryHsl = rgbToHsl(hexToRgb(primaryHex))
   const secondaryHsl = rgbToHsl(hexToRgb(secondaryHex))
   const complementaryHue = (secondaryHsl.h + 180) % 360

   return {
      iconAssemblies: shiftHue(primaryHex, 18, 0.42, 0.42),
      iconAnnotations: shiftHue(secondaryHex, 10, 0.46, 0.45),
      iconOrganisms: rgbToHex(hslToRgb(complementaryHue, 0.52, 0.4)),
      iconBiosamples: rgbToHex(hslToRgb((complementaryHue + 34) % 360, 0.56, 0.43)),
      iconLocalSamples: rgbToHex(hslToRgb((complementaryHue + 60) % 360, 0.58, 0.44)),
      iconExperiments: rgbToHex(hslToRgb((primaryHsl.h + 210) % 360, 0.5, 0.46)),
      iconReads: rgbToHex(hslToRgb((primaryHsl.h + 210) % 360, 0.5, 0.46)),
      iconSubmittedBiosamples: rgbToHex(hslToRgb((secondaryHsl.h + 24) % 360, 0.5, 0.44)),
      iconMap: rgbToHex(hslToRgb((secondaryHsl.h + 165) % 360, 0.55, 0.45)),
   }
}

function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
   const rn = r / 255
   const gn = g / 255
   const bn = b / 255
   const max = Math.max(rn, gn, bn)
   const min = Math.min(rn, gn, bn)
   const delta = max - min
   let h = 0
   if (delta !== 0) {
      if (max === rn) h = ((gn - bn) / delta) % 6
      else if (max === gn) h = (bn - rn) / delta + 2
      else h = (rn - gn) / delta + 4
   }
   h = Math.round(h * 60)
   if (h < 0) h += 360
   const l = (max + min) / 2
   const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
   return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): RGB {
   const c = (1 - Math.abs(2 * l - 1)) * s
   const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
   const m = l - c / 2
   let rn = 0
   let gn = 0
   let bn = 0

   if (h >= 0 && h < 60) {
      rn = c
      gn = x
   } else if (h >= 60 && h < 120) {
      rn = x
      gn = c
   } else if (h >= 120 && h < 180) {
      gn = c
      bn = x
   } else if (h >= 180 && h < 240) {
      gn = x
      bn = c
   } else if (h >= 240 && h < 300) {
      rn = x
      bn = c
   } else {
      rn = c
      bn = x
   }

   return {
      r: (rn + m) * 255,
      g: (gn + m) * 255,
      b: (bn + m) * 255,
   }
}
