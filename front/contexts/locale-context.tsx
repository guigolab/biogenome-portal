'use client'

import {
   createContext,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useState,
   type ReactNode,
} from 'react'

import { localeToHtmlLang, persistLocale, resolveLocale } from '@/lib/i18n/locale'

import cat from '@/messages/cat.json'
import de from '@/messages/de.json'
import en from '@/messages/en.json'
import es from '@/messages/es.json'
import fr from '@/messages/fr.json'
import it from '@/messages/it.json'

type MessageDict = typeof en

const bundles: Record<string, MessageDict> = {
   en: en as MessageDict,
   cat: cat as MessageDict,
   es: es as MessageDict,
   de: de as MessageDict,
   it: it as MessageDict,
   fr: fr as MessageDict,
}

function getNested(obj: unknown, path: string): string | undefined {
   const parts = path.split('.')
   let cur: unknown = obj
   for (const p of parts) {
      if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
      cur = (cur as Record<string, unknown>)[p]
   }
   return typeof cur === 'string' ? cur : undefined
}

type LocaleContextValue = {
   locale: string
   setLocale: (locale: string) => void
   allowedLocales: string[]
   t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
   children,
   allowedLocales,
}: {
   children: ReactNode
   allowedLocales: string[]
}) {
   const [locale, setLocaleState] = useState<string>(() =>
      allowedLocales.length ? resolveLocale(allowedLocales) : 'en',
   )

   useEffect(() => {
      const next = resolveLocale(allowedLocales)
      setLocaleState(next)
   }, [allowedLocales])

   const setLocale = useCallback(
      (next: string) => {
         if (!allowedLocales.includes(next)) return
         setLocaleState(next)
         persistLocale(next)
      },
      [allowedLocales],
   )

   const t = useCallback(
      (key: string) => {
         const bundle = bundles[locale] ?? bundles.en
         const direct = getNested(bundle, key)
         if (direct) return direct
         const fallback = getNested(bundles.en, key)
         return fallback ?? key
      },
      [locale],
   )

   useEffect(() => {
      if (typeof document === 'undefined') return
      document.documentElement.lang = localeToHtmlLang(locale)
   }, [locale])

   const value = useMemo(
      () => ({ locale, setLocale, allowedLocales, t }),
      [locale, setLocale, allowedLocales, t],
   )

   return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
   const ctx = useContext(LocaleContext)
   if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
   return ctx
}
