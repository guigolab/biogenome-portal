'use client'

import type { ReactNode } from 'react'

import { ThemeProvider } from '@/components/theme-provider'
import { usePortalConfig } from '@/contexts/portal-context'
import { getPortalAppearance } from '@/lib/portal'

export function AppThemeProvider({ children }: { children: ReactNode }) {
   const { raw } = usePortalConfig()
   const appearance = raw ? getPortalAppearance(raw) : 'system'
   const forcedTheme = appearance === 'light' || appearance === 'dark' ? appearance : undefined

   return (
      <ThemeProvider
         attribute="class"
         defaultTheme={appearance}
         forcedTheme={forcedTheme}
         enableSystem={appearance === 'system'}
         disableTransitionOnChange
      >
         {children}
      </ThemeProvider>
   )
}
