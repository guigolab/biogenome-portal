'use client'

import type { ReactNode } from 'react'

import { AppThemeProvider } from '@/components/app-theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { LocaleProviderWrapper } from '@/components/locale-provider-wrapper'
import { PortalProvider } from '@/contexts/portal-context'
import type { PortalConfig } from '@/lib/portal'

type ProvidersProps = {
   children: ReactNode
   initialPortal?: PortalConfig
}

export function Providers({ children, initialPortal }: ProvidersProps) {
   return (
      <PortalProvider initialPortal={initialPortal}>
         <AppThemeProvider>
            <LocaleProviderWrapper>
               {children}
               <Toaster richColors closeButton position="top-center" />
            </LocaleProviderWrapper>
         </AppThemeProvider>
      </PortalProvider>
   )
}
