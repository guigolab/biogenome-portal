'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { CmsJobStatusCard, extractSpreadsheetTaskErrors, spreadsheetSuccessSummary } from '@/components/cms/ui/cms-job-status-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { cmsImportSpreadsheet } from '@/lib/cms/services/auth'
import { useCeleryUploadPoll, type TaskPhase } from '@/hooks/use-celery-upload-poll'

export function SpreadsheetUploadPanel() {
   const { messages, phase, isPolling, taskData, startPoll, reset } = useCeleryUploadPoll()
   const [excel, setExcel] = useState<File | null>(null)
   const [submitting, setSubmitting] = useState(false)
   const [submitted, setSubmitted] = useState(false)
   const [form, setForm] = useState({
      id: '',
      taxid: '',
      scientific_name: '',
      header: 1,
      option: 'SKIP' as 'SKIP' | 'UPDATE',
   })

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

   function valid() {
      return form.id.trim() && form.taxid.trim() && form.scientific_name.trim()
   }

   function handleReset() {
      setExcel(null)
      setSubmitted(false)
      setForm({ id: '', taxid: '', scientific_name: '', header: 1, option: 'SKIP' })
      reset()
      setSubmitting(false)
   }

   async function handleSubmit() {
      if (!excel) return
      setSubmitted(true)
      if (!valid()) {
         toast.warning('Fill ID, taxid, and scientific name columns.')
         return
      }
      reset()
      setSubmitting(true)
      const payload = new FormData()
      payload.append('excel', excel)
      for (const [k, v] of Object.entries(form)) {
         if (v !== '' && v !== null && v !== undefined) payload.append(k, String(v))
      }
      try {
         const res = await cmsImportSpreadsheet(payload)
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
      <div className={`space-y-4 ${isBusy ? 'pointer-events-none opacity-60' : ''}`}>
         <div className="grid gap-3 sm:grid-cols-2">
            <div>
               <Label htmlFor="col-id">ID column</Label>
               <Input
                  id="col-id"
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Unique sample id column"
                  className={submitted && !form.id.trim() ? 'border-destructive' : ''}
               />
            </div>
            <div>
               <Label htmlFor="col-taxid">Taxid column</Label>
               <Input
                  id="col-taxid"
                  value={form.taxid}
                  onChange={(e) => setForm((f) => ({ ...f, taxid: e.target.value }))}
                  placeholder="NCBI taxid column"
                  className={submitted && !form.taxid.trim() ? 'border-destructive' : ''}
               />
            </div>
            <div className="sm:col-span-2">
               <Label htmlFor="col-sn">Scientific name column</Label>
               <Input
                  id="col-sn"
                  value={form.scientific_name}
                  onChange={(e) => setForm((f) => ({ ...f, scientific_name: e.target.value }))}
                  placeholder="Scientific name column"
                  className={submitted && !form.scientific_name.trim() ? 'border-destructive' : ''}
               />
            </div>
            <div>
               <Label>Existing ID behaviour</Label>
               <Select
                  value={form.option}
                  onValueChange={(v) => setForm((f) => ({ ...f, option: v as 'SKIP' | 'UPDATE' }))}
               >
                  <SelectTrigger>
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="SKIP">SKIP</SelectItem>
                     <SelectItem value="UPDATE">UPDATE</SelectItem>
                  </SelectContent>
               </Select>
            </div>
            <div>
               <Label htmlFor="header-row">Header row (1-based)</Label>
               <Input
                  id="header-row"
                  type="number"
                  min={1}
                  value={form.header}
                  onChange={(e) => setForm((f) => ({ ...f, header: Math.max(1, Number(e.target.value) || 1) }))}
               />
            </div>
         </div>

         <div>
            <Label htmlFor="xlsx">Spreadsheet (.xlsx)</Label>
            <Input
               id="xlsx"
               type="file"
               accept=".xlsx"
               disabled={isBusy}
               onChange={(e) => setExcel(e.target.files?.[0] ?? null)}
            />
         </div>

         <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={handleReset}>
               Reset
            </Button>
            <Button type="button" size="sm" disabled={!excel || isBusy} onClick={() => void handleSubmit()}>
               Submit spreadsheet
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
