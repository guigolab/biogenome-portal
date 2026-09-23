/**
 * Maps portal locale codes (as configured in `general.languages`) to the i18n
 * message key that holds their human-readable display name.
 *
 * Keep this list in sync with the `language.*` keys in `messages/*.json`.
 */
const LOCALE_MESSAGE_KEYS: Record<string, string> = {
   en: 'language.english',
   cat: 'language.catalan',
   es: 'language.spanish',
   fr: 'language.french',
   de: 'language.german',
   it: 'language.italian',
}

/**
 * Resolve a display label for a portal locale code, e.g. `cat` -> "Catalan".
 * Falls back to the raw code for locales without a known translation.
 */
export function getLocaleLabel(code: string, t: (key: string) => string): string {
   const messageKey = LOCALE_MESSAGE_KEYS[code]
   return messageKey ? t(messageKey) : code
}

/**
 * English-only fallback labels for portal locale codes, for use in server
 * components (e.g. public species pages) that render without access to the
 * client-side `useLocale()` context.
 */
const LOCALE_ENGLISH_LABELS: Record<string, string> = {
   en: 'English',
   cat: 'Catalan',
   es: 'Spanish',
   fr: 'French',
   de: 'German',
   it: 'Italian',
}

export function getStaticLocaleLabel(code: string): string {
   return LOCALE_ENGLISH_LABELS[code] ?? code
}
