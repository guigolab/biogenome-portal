'use client'

import { create } from 'zustand'

export type CmsDashboardDrawerPanel = 'insdc' | 'goat' | 'spreadsheet' | 'user' | 'annotation'

type DrawerState = {
   panel: CmsDashboardDrawerPanel | null
   userName: string | undefined
   annotationName: string | undefined
   insdcImportModel: string | undefined
   isOpen: boolean
   open: (payload: {
      panel: CmsDashboardDrawerPanel
      userName?: string
      annotationName?: string
      insdcImportModel?: string
   }) => void
   close: () => void
}

export const useCmsDrawerStore = create<DrawerState>((set) => ({
   panel: null,
   userName: undefined,
   annotationName: undefined,
   insdcImportModel: undefined,
   isOpen: false,

   open(payload) {
      set({
         panel: payload.panel,
         userName: payload.userName,
         annotationName: payload.annotationName,
         insdcImportModel: payload.insdcImportModel,
         isOpen: true,
      })
   },

   close() {
      set({
         panel: null,
         userName: undefined,
         annotationName: undefined,
         insdcImportModel: undefined,
         isOpen: false,
      })
   },
}))
