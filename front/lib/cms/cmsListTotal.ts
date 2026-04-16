/**
 * Reads `total` from CMS list JSON (`{ total, data }`). Handles numeric strings and missing keys.
 */
export function cmsListTotal(json: unknown): number | null {
   if (!json || typeof json !== 'object') return null
   const o = json as Record<string, unknown>
   const raw = o.total
   if (typeof raw === 'number' && Number.isFinite(raw)) return raw
   if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
   }
   return null
}
