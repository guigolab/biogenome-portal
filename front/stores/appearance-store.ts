'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PortalAppearance = 'light' | 'dark' | 'system'

type AppearanceState = {
   appearance: PortalAppearance
   setAppearance: (appearance: PortalAppearance) => void
}

export const useAppearanceStore = create<AppearanceState>()(
   persist(
      (set) => ({
         appearance: 'system',
         setAppearance: (appearance) => set({ appearance }),
      }),
      { name: 'portal-appearance' },
   ),
)
