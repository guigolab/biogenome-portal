'use client'

import { useEffect } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { INSDC_MODEL_META, INSDC_MODEL_ORDER, type InsdcModel } from '@/lib/cms/insdc-model-meta'
import { cn } from '@/lib/utils'
import { useInsdcImportFlow } from '@/hooks/use-insdc-import-flow'

const STEPS = [
   { id: 1, label: 'Type' },
   { id: 2, label: 'Accession' },
   { id: 3, label: 'Review' },
   { id: 4, label: 'Result' },
] as const

function validPreset(m: string | undefined): m is InsdcModel {
   return m === 'biosamples' || m === 'assemblies' || m === 'reads'
}

export function InsdcImportPanel({ presetModel }: { presetModel?: string | null }) {
   const init = validPreset(presetModel ?? undefined) ? (presetModel as InsdcModel) : undefined
   const flow = useInsdcImportFlow(init)

   useEffect(() => {
      if (validPreset(presetModel ?? undefined)) {
         flow.setStep(2)
      }
   }, [presetModel])

   const { step, model, setModel, accession, setAccession, activeMeta, accessionValid, isStepValid, next, back, submit, phase, resultMessage, resultDetails, newImport, reset } = flow

   return (
      <div className="space-y-6">
         <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {STEPS.map((s, i) => (
               <div key={s.id} className="flex items-center gap-1">
                  <span
                     className={cn(
                        'flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 font-medium',
                        step === s.id && 'border-primary bg-primary/10 text-primary',
                        step > s.id && 'border-chart-2 bg-chart-2/15 text-chart-2',
                     )}
                  >
                     {step > s.id ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  <span className={cn(step === s.id && 'font-medium text-foreground')}>{s.label}</span>
                  {i < STEPS.length - 1 ? <span className="mx-0.5 text-border">/</span> : null}
               </div>
            ))}
         </div>

         {step === 1 && (
            <div className="space-y-3">
               <h3 className="text-sm font-semibold">Choose import type</h3>
               <RadioGroup value={model} onValueChange={(v) => setModel(v as InsdcModel)} className="grid gap-2">
                  {INSDC_MODEL_ORDER.map((k) => {
                     const meta = INSDC_MODEL_META[k]
                     return (
                        <label
                           key={k}
                           className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors',
                              model === k && 'border-primary bg-primary/5',
                           )}
                        >
                           <RadioGroupItem value={k} className="mt-0.5" />
                           <div>
                              <div className="font-medium">{meta.label}</div>
                              <p className="text-xs text-muted-foreground">{meta.description}</p>
                           </div>
                        </label>
                     )
                  })}
               </RadioGroup>
            </div>
         )}

         {step === 2 && (
            <div className="space-y-3">
               <h3 className="text-sm font-semibold">Accession</h3>
               <p className="text-xs text-muted-foreground">{activeMeta.description}</p>
               <div>
                  <Label htmlFor="insdc-acc">{activeMeta.label} accession</Label>
                  <Input
                     id="insdc-acc"
                     value={accession}
                     onChange={(e) => setAccession(e.target.value)}
                     placeholder={activeMeta.accessionHint}
                     className={cn('font-mono', accession.length > 0 && !accessionValid && 'border-destructive')}
                  />
                  {accession.length > 0 && !accessionValid ? (
                     <p className="mt-1 text-xs text-destructive">Accession format does not match this type.</p>
                  ) : null}
               </div>
            </div>
         )}

         {step === 3 && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
               <h3 className="font-semibold">Review</h3>
               <p>
                  <span className="text-muted-foreground">Type:</span> {activeMeta.label}
               </p>
               <p>
                  <span className="text-muted-foreground">Accession:</span>{' '}
                  <span className="font-mono font-medium">{flow.normalizedAccession}</span>
               </p>
               {activeMeta.sideEffects ? (
                  <p className="text-xs text-muted-foreground">{activeMeta.sideEffects}</p>
               ) : null}
            </div>
         )}

         {step === 4 && (
            <div className="space-y-3">
               {phase === 'submitting' && <p className="text-sm text-muted-foreground">Importing…</p>}
               {phase === 'success' && (
                  <div className="rounded-lg border border-chart-2/40 bg-chart-2/5 p-3 text-sm">
                     <p className="font-medium text-chart-2">{resultMessage}</p>
                     {resultDetails ? <p className="mt-1 text-xs text-muted-foreground">{resultDetails}</p> : null}
                  </div>
               )}
               {phase === 'error' && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                     {resultMessage}
                  </div>
               )}
               <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => newImport()}>
                     New import
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => reset()}>
                     Start over
                  </Button>
               </div>
            </div>
         )}

         {step < 4 ? (
            <div className="flex justify-between gap-2 pt-2">
               <Button type="button" variant="ghost" size="sm" disabled={step <= 1} onClick={back} className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Back
               </Button>
               {step === 3 ? (
                  <Button type="button" size="sm" disabled={!isStepValid} onClick={() => void submit()}>
                     {activeMeta.createLabel}
                  </Button>
               ) : (
                  <Button type="button" size="sm" disabled={!isStepValid} onClick={next} className="gap-1">
                     Continue
                     <ChevronRight className="h-4 w-4" />
                  </Button>
               )}
            </div>
         ) : null}
      </div>
   )
}
