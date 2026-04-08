'use client'

import { useTheme } from 'next-themes'
import { useEffect } from 'react'

import { useAppearanceStore } from '@/stores/appearance-store'

/** Keeps next-themes in sync with persisted appearance (store updates after rehydration). */
export function AppearanceThemeSync() {
   const appearance = useAppearanceStore((s) => s.appearance)
   const { setTheme } = useTheme()

   useEffect(() => {
      setTheme(appearance)
   }, [appearance, setTheme])

   return null
}
