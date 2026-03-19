import { computed } from 'vue'
import { useColors } from 'vuestic-ui'

export const RANK_KEYS = [
   'domain',
   'kingdom',
   'phylum',
   'subphylum',
   'class',
   'subclass',
   'order',
   'superorder',
   'family',
   'genus',
   'species',
   'subspecies',
] as const

export type RankKey = (typeof RANK_KEYS)[number]

type RGB = { r: number; g: number; b: number }

export function useRankPalette() {
   const colorTools = useColors() as any

   const rankPalette = computed(() => {
      const secondary = resolveThemeColor(colorTools, 'secondary', '#4b5563')
      const { h } = rgbToHsl(hexToRgb(secondary))
      const complementaryHue = (h + 180) % 360

      return RANK_KEYS.map((rank, index) => {
         const progress = index / Math.max(1, RANK_KEYS.length - 1)
         const hue = (complementaryHue + progress * 165) % 360
         const saturation = 0.46 + progress * 0.12
         const lightness = 0.42 + progress * 0.14
         const color = rgbToHex(hslToRgb(hue, saturation, lightness))
         return { rank, color }
      })
   })

   const rankColorMap = computed<Record<string, string>>(() =>
      Object.fromEntries(rankPalette.value.map(({ rank, color }) => [rank, color])),
   )

   return {
      rankPalette,
      rankColorMap,
   }
}

function resolveThemeColor(colorTools: any, name: string, fallback: string): string {
   try {
      if (typeof colorTools?.getColor === 'function') {
         const value = colorTools.getColor(name)
         if (typeof value === 'string' && value.trim()) return normalizeHex(value)
      }
      const direct = colorTools?.colors?.[name]
      if (typeof direct === 'string' && direct.trim()) return normalizeHex(direct)
      const nested = colorTools?.colors?.colors?.[name]
      if (typeof nested === 'string' && nested.trim()) return normalizeHex(nested)
   } catch {
      // fallback below
   }
   return normalizeHex(fallback)
}

function normalizeHex(hex: string): string {
   const cleaned = String(hex || '')
      .trim()
      .replace('#', '')
   if (cleaned.length === 3) {
      return `#${cleaned
         .split('')
         .map((c) => c + c)
         .join('')
         .toLowerCase()}`
   }
   if (cleaned.length !== 6) return '#4b5563'
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
