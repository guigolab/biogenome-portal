import type { PortalConfig } from './types'

const FALLBACK_SITE_TITLE = 'BioGenome Portal'

/** Mirrors `normalizeGeneralLanguages` in `portalConfig.ts` for server-only metadata. */
function normalizePortalLanguageCodes(raw: unknown): string[] {
   if (!Array.isArray(raw)) return []
   return raw
      .map((item) => {
         if (typeof item === 'string') return item === 'es-ct' ? 'cat' : item
         if (
            item &&
            typeof item === 'object' &&
            'code' in item &&
            typeof (item as { code: unknown }).code === 'string'
         ) {
            const c = (item as { code: string }).code
            return c === 'es-ct' ? 'cat' : c
         }
         return ''
      })
      .filter(Boolean)
}

function pickLocalized(
   map: Record<string, string> | undefined,
   languages: string[],
): string | undefined {
   if (!map) return undefined
   const ordered = languages.length > 0 ? languages : ['en']
   for (const lang of ordered) {
      const v = map[lang]
      if (typeof v === 'string' && v.trim()) return v.trim()
   }
   const en = map.en
   if (typeof en === 'string' && en.trim()) return en.trim()
   for (const v of Object.values(map)) {
      if (typeof v === 'string' && v.trim()) return v.trim()
   }
   return undefined
}

/** Browser tab / `og:site_name` title from `portal.json` `general.title`. */
export function portalSiteTitle(portal: PortalConfig | null | undefined): string {
   const general = portal?.general as { title?: Record<string, string> } | undefined
   const langs = normalizePortalLanguageCodes(portal?.general?.languages)
   return pickLocalized(general?.title, langs) ?? FALLBACK_SITE_TITLE
}

/** Default meta description from `portal.json` `general.description`. */
export function portalSiteDescription(portal: PortalConfig | null | undefined): string | undefined {
   const general = portal?.general as { description?: Record<string, string> } | undefined
   const langs = normalizePortalLanguageCodes(portal?.general?.languages)
   return pickLocalized(general?.description, langs)
}
