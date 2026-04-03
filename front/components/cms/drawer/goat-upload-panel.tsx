'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Info } from 'lucide-react'
import { toast } from 'sonner'

import { CmsJobStatusCard, extractSpreadsheetTaskErrors, spreadsheetSuccessSummary } from '@/components/cms/ui/cms-job-status-card'
import { Button } from '@/components/ui/button'
import {
   Dialog,
   DialogClose,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { cmsImportGoatReport } from '@/lib/cms/services/auth'
import { useCeleryUploadPoll, type TaskPhase } from '@/hooks/use-celery-upload-poll'

export function GoatUploadPanel() {
   const { messages, phase, isPolling, taskData, startPoll, reset } = useCeleryUploadPoll()
   const [file, setFile] = useState<File | null>(null)
   const [submitting, setSubmitting] = useState(false)

   const isBusy = submitting || isPolling

   const progressMessages = useMemo(
      () => (phase === 'running' || phase === 'queued' ? messages : []),
      [phase, messages],
   )
   const errorMessages = useMemo(
      () => extractSpreadsheetTaskErrors(phase, messages, taskData),
      [phase, messages, taskData],
   )
   const successSummary = useMemo(
      () => (phase === 'success' ? spreadsheetSuccessSummary(taskData) : null),
      [phase, taskData],
   )

   function handleReset() {
      setFile(null)
      reset()
      setSubmitting(false)
   }

   async function handleSubmit() {
      if (!file) return
      reset()
      setSubmitting(true)
      const fd = new FormData()
      fd.append('goat_report', file)
      try {
         const res = await cmsImportGoatReport(fd)
         const id = (res as { id?: string }).id
         if (!id) throw new Error('No task id returned')
         startPoll(id)
      } catch (e) {
         toast.error(extractApiMessage(e, 'Upload failed'))
      } finally {
         setSubmitting(false)
      }
   }

   return (
      <div className="space-y-4">
         <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">
               Upload a GoaT-format TSV. New taxa are fetched from INSDC when needed.
            </p>
            <Dialog>
               <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1">
                     <Info className="h-3.5 w-3.5" />
                     Guidelines
                  </Button>
               </DialogTrigger>
               <DialogContent>
                  <DialogHeader>
                     <DialogTitle>GoaT upload</DialogTitle>
                     <DialogDescription asChild>
                        <div className="space-y-3 text-left text-sm text-muted-foreground">
                           <p>Use a valid GoaT TSV (one row per species, valid ncbi_taxon_id).</p>
                           <p>
                              <a
                                 href="https://docs.google.com/spreadsheets/d/1eC6jQctRoUaeGWWDbb1qsWs-7ajC462nnJdHK4N3ivw"
                                 target="_blank"
                                 rel="noreferrer"
                                 className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                              >
                                 Template reference
                                 <ExternalLink className="h-3 w-3" />
                              </a>
                           </p>
                        </div>
                     </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                     <DialogClose asChild>
                        <Button type="button" variant="secondary">
                           Close
                        </Button>
                     </DialogClose>
                  </DialogFooter>
               </DialogContent>
            </Dialog>
         </div>

         <div className={isBusy ? 'pointer-events-none opacity-60' : ''}>
            <Label htmlFor="goat-tsv" className="mb-2 block text-sm font-medium">
               TSV file
            </Label>
            <Input
               id="goat-tsv"
               type="file"
               accept=".tsv"
               disabled={isBusy}
               onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
         </div>

         <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={handleReset}>
               Reset
            </Button>
            <Button type="button" size="sm" disabled={!file || isBusy} onClick={() => void handleSubmit()}>
               Upload report
            </Button>
         </div>

         <CmsJobStatusCard
            phase={phase as TaskPhase}
            progressMessages={progressMessages}
            errorMessages={errorMessages}
            successSummary={successSummary}
         />
      </div>
   )
}
