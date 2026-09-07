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
   /** Backend-derived root taxid (`GET /taxons/root`), fetched server-side in the root layout. */
   initialRootTaxid?: string
}

export function Providers({ children, initialPortal, initialRootTaxid }: ProvidersProps) {
   return (
      <PortalProvider initialPortal={initialPortal} initialRootTaxid={initialRootTaxid}>
         <AppThemeProvider>
            <LocaleProviderWrapper>
               {children}
               <Toaster richColors closeButton position="top-center" />
            </LocaleProviderWrapper>
         </AppThemeProvider>
      </PortalProvider>
   )
}
