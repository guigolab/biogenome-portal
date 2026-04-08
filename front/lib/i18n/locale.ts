const STORAGE_KEY = 'portal-locale'

function normalizeLocaleCode(input: string): string {
   const raw = input.trim().toLowerCase().replace(/_/g, '-')
   if (!raw) return 'en'
   if (raw === 'es-ct' || raw === 'ca' || raw.startsWith('ca-')) return 'cat'
   return raw
}

function localeBase(input: string): string {
   return normalizeLocaleCode(input).split('-')[0] || 'en'
}

export function normalizeAllowedLocales(input: string[]): string[] {
   const normalized = input
      .map((item) => normalizeLocaleCode(item))
      .filter(Boolean)
   return [...new Set(normalized)]
}

function browserLocaleCandidates(): string[] {
   if (typeof navigator === 'undefined') return ['en']
   const preferred = Array.isArray(navigator.languages) ? navigator.languages : []
   const raw = [...preferred, navigator.language].filter((v): v is string => typeof v === 'string' && !!v)
   const normalized = raw.map((v) => normalizeLocaleCode(v))
   const expanded = normalized.flatMap((v) => {
      const base = localeBase(v)
      return v === base ? [v] : [v, base]
   })
   return [...new Set(expanded)]
}

function matchAllowedLocale(candidate: string, allowed: string[]): string | null {
   if (allowed.includes(candidate)) return candidate
   const base = localeBase(candidate)
   if (allowed.includes(base)) return base
   const regionMatch = allowed.find((a) => localeBase(a) === base)
   return regionMatch ?? null
}

export function detectBrowserLocale(allowed: string[] = []): string {
   const normalizedAllowed = normalizeAllowedLocales(allowed)
   const candidates = browserLocaleCandidates()
   for (const candidate of candidates) {
      if (!normalizedAllowed.length) return candidate
      const match = matchAllowedLocale(candidate, normalizedAllowed)
      if (match) return match
   }
   return normalizedAllowed.includes('en') ? 'en' : (normalizedAllowed[0] ?? 'en')
}

/**
 * Pick a locale allowed by portal `general.languages`, using stored preference, then browser.
 */
export function resolveLocale(allowed: string[]): string {
   const normalizedAllowed = normalizeAllowedLocales(allowed)
   if (!normalizedAllowed.length) return 'en'
   if (typeof window === 'undefined') {
      return normalizedAllowed.includes('en') ? 'en' : normalizedAllowed[0]
   }
   try {
      const stored = localStorage.getItem(STORAGE_KEY)?.trim()
      if (stored) {
         const normalizedStored = normalizeLocaleCode(stored)
         const storedMatch = matchAllowedLocale(normalizedStored, normalizedAllowed)
         if (storedMatch) return storedMatch
      }
   } catch {
      /* ignore */
   }
   const browser = detectBrowserLocale(normalizedAllowed)
   const browserMatch = matchAllowedLocale(browser, normalizedAllowed)
   if (browserMatch) return browserMatch
   if (normalizedAllowed.includes('en')) return 'en'
   return normalizedAllowed[0]
}

export function persistLocale(locale: string): void {
   try {
      localStorage.setItem(STORAGE_KEY, normalizeLocaleCode(locale))
   } catch {
      /* ignore */
   }
}

export function localeToHtmlLang(locale: string): string {
   if (locale === 'cat') return 'ca'
   return locale.split('-')[0] || 'en'
}
