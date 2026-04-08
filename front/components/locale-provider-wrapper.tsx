'use client'

import type { ReactNode } from 'react'

import { LocaleProvider } from '@/contexts/locale-context'
import { normalizeAllowedLocales } from '@/lib/i18n/locale'
import { usePortalConfig } from '@/contexts/portal-context'

export function LocaleProviderWrapper({ children }: { children: ReactNode }) {
   const { config } = usePortalConfig()
   const rawLangs = config?.general?.languages
   const allowedLocales = normalizeAllowedLocales(
      Array.isArray(rawLangs) && rawLangs.length ? (rawLangs as string[]) : ['en'],
   )

   return <LocaleProvider allowedLocales={allowedLocales}>{children}</LocaleProvider>
}
