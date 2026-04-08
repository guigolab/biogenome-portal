'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AnnotationFormPanel } from '@/components/cms/drawer/annotation-form-panel'
import { GoatUploadPanel } from '@/components/cms/drawer/goat-upload-panel'
import { InsdcImportPanel } from '@/components/cms/drawer/insdc-import-panel'
import { SpreadsheetUploadPanel } from '@/components/cms/drawer/spreadsheet-upload-panel'
import { UserFormPanel } from '@/components/cms/drawer/user-form-panel'
import { useCmsDrawerStore, type CmsDashboardDrawerPanel } from '@/stores/cms-drawer-store'
import { cn } from '@/lib/utils'

const PANEL_COPY: Record<CmsDashboardDrawerPanel, { title: string; description: string }> = {
   insdc: {
      title: 'Import from INSDC',
      description: 'BioSamples, assemblies, and reads by accession.',
   },
   goat: {
      title: 'GoaT report upload',
      description: 'Bulk organism updates from a GoaT TSV.',
   },
   spreadsheet: {
      title: 'Sample metadata import',
      description: 'Spreadsheet upload for local samples.',
   },
   user: {
      title: 'User',
      description: 'Create or edit curator accounts and species assignments.',
   },
   annotation: {
      title: 'Annotation',
      description: 'Create or edit annotation records.',
   },
}

function sheetWidth(panel: CmsDashboardDrawerPanel | null) {
   if (panel === 'user' || panel === 'annotation') return 'sm:max-w-xl'
   return 'sm:max-w-md'
}

export function CmsDashboardDrawer() {
   const isOpen = useCmsDrawerStore((s) => s.isOpen)
   const panel = useCmsDrawerStore((s) => s.panel)
   const close = useCmsDrawerStore((s) => s.close)
   const userName = useCmsDrawerStore((s) => s.userName)
   const annotationName = useCmsDrawerStore((s) => s.annotationName)
   const insdcImportModel = useCmsDrawerStore((s) => s.insdcImportModel)

   const meta = panel ? PANEL_COPY[panel] : null
   const title =
      panel === 'user' && userName
         ? `Edit ${userName}`
         : panel === 'user'
           ? 'Create user'
           : panel === 'annotation' && annotationName
             ? `Edit ${annotationName}`
             : panel === 'annotation'
               ? 'Create annotation'
               : meta?.title ?? ''

   return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
         <SheetContent
            className={cn(
               'flex h-full min-h-0 w-full flex-col gap-0 overflow-hidden p-0',
               sheetWidth(panel),
            )}
            onOpenAutoFocus={(e) => {
               if (panel === 'user') {
                  e.preventDefault()
                  requestAnimationFrame(() => {
                     document.getElementById('cms-user-name')?.focus()
                  })
               }
            }}
         >
            <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 pt-4">
               <SheetHeader className="shrink-0 space-y-1 border-b border-border/80 px-0 pb-3 text-left">
                  <SheetTitle>{title}</SheetTitle>
                  {meta ? <SheetDescription>{meta.description}</SheetDescription> : null}
               </SheetHeader>

               <div className="min-h-0 flex-1 overflow-y-auto pt-4">
                  {panel === 'insdc' ? <InsdcImportPanel presetModel={insdcImportModel} /> : null}
                  {panel === 'goat' ? <GoatUploadPanel /> : null}
                  {panel === 'spreadsheet' ? <SpreadsheetUploadPanel /> : null}
                  {panel === 'user' ? <UserFormPanel editName={userName} /> : null}
                  {panel === 'annotation' ? <AnnotationFormPanel editName={annotationName} /> : null}
               </div>
            </div>
         </SheetContent>
      </Sheet>
   )
}
