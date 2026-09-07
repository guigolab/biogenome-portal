/**
 * Shared CARTO raster basemap config for Leaflet. CARTO's public basemap CDN now requires an
 * API key — unkeyed requests still resolve but every tile is stamped "API KEY REQUIRED". Free
 * tier key: https://carto.com/basemaps/apikey/ (5M tiles/month fair use).
 */

const CARTO_API_KEY = 'cb1_2pbn_1_8d21564c556c6db9c82377e4'

export const CARTO_ATTRIBUTION =
   '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

export const CARTO_TILE_OPTIONS = {
   attribution: CARTO_ATTRIBUTION,
   subdomains: 'abcd' as const,
   maxZoom: 20,
} as const

export const CARTO_DARK = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`
export const CARTO_LIGHT = `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`

/** Picks the keyed CARTO tile URL template for the current basemap theme. */
export function cartoTileUrl(dark: boolean): string {
   return dark ? CARTO_DARK : CARTO_LIGHT
}
