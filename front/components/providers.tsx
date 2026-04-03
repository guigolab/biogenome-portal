'use client'

import type { ReactNode } from 'react'

import { AppThemeProvider } from '@/components/app-theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { LocaleProviderWrapper } from '@/components/locale-provider-wrapper'
import { PortalProvider } from '@/contexts/portal-context'

export function Providers({ children }: { children: ReactNode }) {
   return (
      <PortalProvider>
         <AppThemeProvider>
            <LocaleProviderWrapper>
               {children}
               <Toaster richColors closeButton position="top-center" />
            </LocaleProviderWrapper>
         </AppThemeProvider>
      </PortalProvider>
   )
}
