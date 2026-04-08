'use client'

import type { ReactNode } from 'react'

import { AppearanceThemeSync } from '@/components/appearance-theme-sync'
import { ThemeProvider } from '@/components/theme-provider'
import { useAppearanceStore } from '@/stores/appearance-store'

export function AppThemeProvider({ children }: { children: ReactNode }) {
   const appearance = useAppearanceStore((s) => s.appearance)
   const forcedTheme = appearance === 'light' || appearance === 'dark' ? appearance : undefined

   return (
      <ThemeProvider
         attribute="class"
         defaultTheme={appearance}
         forcedTheme={forcedTheme}
         enableSystem={appearance === 'system'}
         disableTransitionOnChange
      >
         <AppearanceThemeSync />
         {children}
      </ThemeProvider>
   )
}
