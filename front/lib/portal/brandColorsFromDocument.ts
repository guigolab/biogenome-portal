/**
 * Resolve portal-driven CSS variables to RGB strings for Leaflet, canvas, and other
 * imperative APIs that cannot use Tailwind classes.
 */

export type BrandCssVarName =
   | '--primary'
   | '--secondary'
   | '--accent'
   | '--foreground'
   | '--muted-foreground'

const FALLBACK_RGB: Record<BrandCssVarName, string> = {
   '--primary': 'rgb(34, 197, 94)',
   '--secondary': 'rgb(59, 130, 246)',
   '--accent': 'rgb(45, 212, 191)',
   '--foreground': 'rgb(10, 10, 10)',
   '--muted-foreground': 'rgb(113, 113, 122)',
}

/**
 * Read the used `color` for `var(--name)` on `root` (typically `document.documentElement`).
 */
export function resolveCssVarToRgb(root: HTMLElement, varName: BrandCssVarName): string {
   if (typeof document === 'undefined') return FALLBACK_RGB[varName]

   const probe = document.createElement('div')
   probe.style.cssText = `position:absolute;left:-9999px;top:0;color:var(${varName});`
   root.appendChild(probe)
   const rgb = getComputedStyle(probe).color
   root.removeChild(probe)

   if (!rgb || rgb === 'rgba(0, 0, 0, 0)') return FALLBACK_RGB[varName]
   return rgb
}

export type LeafletCircleMarkerStyle = {
   radius: number
   color: string
   fillColor: string
   fillOpacity: number
   weight: number
}

/** Default / hover / selected frequency markers aligned with portal primary / secondary / accent. */
export function leafletMarkerPalettesFromRoot(root: HTMLElement): {
   default: LeafletCircleMarkerStyle
   selected: LeafletCircleMarkerStyle
   hover: LeafletCircleMarkerStyle
} {
   const primary = resolveCssVarToRgb(root, '--primary')
   const secondary = resolveCssVarToRgb(root, '--secondary')
   const accent = resolveCssVarToRgb(root, '--accent')
   return {
      default: {
         radius: 8,
         color: primary,
         fillColor: primary,
         fillOpacity: 0.45,
         weight: 1,
      },
      selected: {
         radius: 11,
         color: accent,
         fillColor: accent,
         fillOpacity: 0.85,
         weight: 2,
      },
      hover: {
         radius: 10,
         color: secondary,
         fillColor: secondary,
         fillOpacity: 0.72,
         weight: 2,
      },
   }
}
