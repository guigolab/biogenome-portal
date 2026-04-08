'use client'

import { useTheme } from 'next-themes'
import { useLayoutEffect, useState } from 'react'

export type TaxonomyLeafLabelColors = {
   defaultFill: string
   hoverFill: string
}

/**
 * High-contrast leaf labels: prefers resolved `--foreground` / `--primary` from the theme
 * (portal + shadcn), with sensible fallbacks.
 */
export function useTaxonomyLeafLabelColors(): TaxonomyLeafLabelColors {
   const { resolvedTheme } = useTheme()
   const isDark = resolvedTheme === 'dark'
   const [colors, setColors] = useState<TaxonomyLeafLabelColors>(() => ({
      defaultFill: isDark ? '#fafafa' : '#0a0a0a',
      hoverFill: isDark ? '#fbbf24' : '#d97706',
   }))

   useLayoutEffect(() => {
      const root = document.documentElement
      const cs = getComputedStyle(root)
      const fg = cs.getPropertyValue('--foreground').trim()
      const primary = cs.getPropertyValue('--primary').trim()
      const resolved = (raw: string, fallbackLight: string, fallbackDark: string) => {
         if (
            raw.startsWith('rgb') ||
            raw.startsWith('#') ||
            raw.startsWith('hsl') ||
            raw.startsWith('oklch')
         ) {
            return raw
         }
         return isDark ? fallbackDark : fallbackLight
      }
      setColors({
         defaultFill: resolved(fg, '#0a0a0a', '#fafafa'),
         hoverFill: resolved(primary, '#d97706', '#fbbf24'),
      })
   }, [isDark, resolvedTheme])

   return colors
}
