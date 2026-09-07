'use client'

import { create } from 'zustand'

export type CmsDashboardDrawerPanel = 'insdc' | 'user' | 'annotation' | 'principal'

type DrawerState = {
   panel: CmsDashboardDrawerPanel | null
   userName: string | undefined
   annotationName: string | undefined
   insdcImportModel: string | undefined
   principalSlug: string | undefined
   isOpen: boolean
   /** Bumped after a successful principal create/update so list modules can refetch. */
   principalSavedAt: number
   open: (payload: {
      panel: CmsDashboardDrawerPanel
      userName?: string
      annotationName?: string
      insdcImportModel?: string
      principalSlug?: string
   }) => void
   close: () => void
   notifyPrincipalSaved: () => void
}

const closedFields = {
   panel: null as CmsDashboardDrawerPanel | null,
   userName: undefined as string | undefined,
   annotationName: undefined as string | undefined,
   insdcImportModel: undefined as string | undefined,
   principalSlug: undefined as string | undefined,
   isOpen: false,
}

export const useCmsDrawerStore = create<DrawerState>((set) => ({
   ...closedFields,
   principalSavedAt: 0,

   open(payload) {
      set({
         panel: payload.panel,
         userName: payload.userName,
         annotationName: payload.annotationName,
         insdcImportModel: payload.insdcImportModel,
         principalSlug: payload.principalSlug,
         isOpen: true,
      })
   },

   close() {
      set({ ...closedFields })
   },

   notifyPrincipalSaved() {
      set((s) => ({
         ...closedFields,
         principalSavedAt: s.principalSavedAt + 1,
      }))
   },
}))
