'use client'

import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react'

import type { TaskPhase } from '@/hooks/use-celery-upload-poll'
import { cn } from '@/lib/utils'

const PHASE_LABEL: Record<TaskPhase, string> = {
   idle: '',
   queued: 'Queued',
   running: 'Running',
   success: 'Succeeded',
   error: 'Failed',
}

export function CmsJobStatusCard({
   phase,
   progressMessages = [],
   errorMessages = [],
   successSummary,
}: {
   phase: TaskPhase
   progressMessages?: string[]
   errorMessages?: string[]
   successSummary?: {
      recordsSaved: number
      createdOrganisms: number
      skippedOrNotFound: number
   } | null
}) {
   if (phase === 'idle') return null

   return (
      <div
         role="status"
         aria-live="polite"
         className={cn(
            'rounded-lg border p-4 text-sm',
            phase === 'error' && 'border-destructive/50 bg-destructive/5',
            phase === 'success' && 'border-chart-2/40 bg-chart-2/5',
            (phase === 'queued' || phase === 'running') && 'border-border bg-muted/40',
         )}
      >
         <div className="mb-3 flex items-center gap-2">
            {phase === 'queued' || phase === 'running' ? (
               <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : phase === 'success' ? (
               <CheckCircle2 className="h-4 w-4 shrink-0 text-chart-2" />
            ) : (
               <CircleAlert className="h-4 w-4 shrink-0 text-destructive" />
            )}
            <span className="font-medium">{PHASE_LABEL[phase]}</span>
            <span className="text-muted-foreground">Import status</span>
         </div>

         {(phase === 'queued' || phase === 'running') && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
               <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
         )}

         {phase === 'success' && successSummary ? (
            <dl className="mb-3 space-y-1.5 text-xs">
               <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Records saved</dt>
                  <dd className="font-semibold tabular-nums">{successSummary.recordsSaved}</dd>
               </div>
               <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">New organisms</dt>
                  <dd className="font-semibold tabular-nums">{successSummary.createdOrganisms}</dd>
               </div>
               <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Skipped / not found</dt>
                  <dd className="font-semibold tabular-nums">{successSummary.skippedOrNotFound}</dd>
               </div>
               {successSummary.createdOrganisms > 0 &&
               successSummary.createdOrganisms !== successSummary.recordsSaved ? (
                  <p className="pt-1 text-[11px] leading-snug text-muted-foreground">
                     New organisms can differ from saved rows when existing records are updated.
                  </p>
               ) : null}
            </dl>
         ) : null}

         {progressMessages.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
               {progressMessages.map((msg, i) => (
                  <li key={`p-${i}`}>{msg}</li>
               ))}
            </ul>
         ) : null}

         {phase === 'error' && errorMessages.length > 0 ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-destructive">
               {errorMessages.map((msg, i) => (
                  <li key={`e-${i}`}>{msg}</li>
               ))}
            </ul>
         ) : null}
      </div>
   )
}

export function extractSpreadsheetTaskErrors(
   phase: TaskPhase,
   messages: string[],
   taskData: Record<string, unknown> | null,
): string[] {
   if (phase !== 'error') return []
   const err = taskData?.error
   if (err && typeof err === 'object') {
      const errs = (err as Record<string, unknown>).errors
      if (Array.isArray(errs)) return errs.map(String)
      const msg = (err as Record<string, unknown>).message
      if (typeof msg === 'string') return msg.split('\n').map((s) => s.trim()).filter(Boolean)
   }
   if (typeof err === 'string') return err.split('\n').map((s) => s.trim()).filter(Boolean)
   return messages.length ? messages : ['Upload failed.']
}

export function spreadsheetSuccessSummary(taskData: Record<string, unknown> | null) {
   const result =
      taskData?.result && typeof taskData.result === 'object'
         ? (taskData.result as Record<string, unknown>)
         : {}
   const summary =
      result.summary && typeof result.summary === 'object'
         ? (result.summary as Record<string, unknown>)
         : {}
   return {
      recordsSaved: Number(summary.records_saved ?? 0),
      createdOrganisms: Number(summary.created_organisms ?? 0),
      skippedOrNotFound: Number(summary.records_skipped_or_not_found ?? 0),
   }
}
