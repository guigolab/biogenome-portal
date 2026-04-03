const STORAGE_KEY = 'portal-locale'

export function detectBrowserLocale(): string {
   if (typeof navigator === 'undefined') return 'en'
   const bl = (navigator.language || 'en').toLowerCase()
   if (bl === 'es-ct' || bl === 'ca' || bl.startsWith('ca-')) return 'cat'
   return (navigator.language || 'en').split('-')[0] || 'en'
}

/**
 * Pick a locale allowed by portal `general.languages`, using stored preference, then browser.
 */
export function resolveLocale(allowed: string[]): string {
   if (!allowed.length) return 'en'
   if (typeof window === 'undefined') {
      return allowed.includes('en') ? 'en' : allowed[0]
   }
   try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && allowed.includes(stored)) return stored
   } catch {
      /* ignore */
   }
   const browser = detectBrowserLocale()
   if (allowed.includes(browser)) return browser
   const short = browser.split('-')[0]
   if (allowed.includes(short)) return short
   if (allowed.includes('en')) return 'en'
   return allowed[0]
}

export function persistLocale(locale: string): void {
   try {
      localStorage.setItem(STORAGE_KEY, locale)
   } catch {
      /* ignore */
   }
}

export function localeToHtmlLang(locale: string): string {
   if (locale === 'cat') return 'ca'
   return locale.split('-')[0] || 'en'
}
