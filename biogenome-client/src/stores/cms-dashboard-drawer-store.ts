import { defineStore } from 'pinia'

export type CmsDashboardDrawerPanel = 'insdc' | 'goat' | 'spreadsheet' | 'user' | 'annotation'

export const useCmsDashboardDrawerStore = defineStore('cmsDashboardDrawer', {
   state: () => ({
      panel: null as CmsDashboardDrawerPanel | null,
      /** Edit user: username */
      userName: undefined as string | undefined,
      /** Edit annotation: name */
      annotationName: undefined as string | undefined,
      /** INSDC pre-selected model (biosamples | assemblies | reads) */
      insdcImportModel: undefined as string | undefined,
   }),
   getters: {
      isOpen: (s): boolean => s.panel !== null,
   },
   actions: {
      open(payload: {
         panel: CmsDashboardDrawerPanel
         userName?: string
         annotationName?: string
         insdcImportModel?: string
      }) {
         this.panel = payload.panel
         this.userName = payload.userName
         this.annotationName = payload.annotationName
         this.insdcImportModel = payload.insdcImportModel
      },
      close() {
         this.panel = null
         this.userName = undefined
         this.annotationName = undefined
         this.insdcImportModel = undefined
      },
   },
})
