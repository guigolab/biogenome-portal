'use client'

import { scaleLinear } from 'd3-scale'
import { useMemo } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { chromosomeSequenceLengthBp, primaryChromosomeLabel } from '@/lib/genome-browser/chrLabels'
import { cn } from '@/lib/utils'
import type { ChromosomeRow } from '@/lib/genome-browser/buildDefaultSession'

const BAR_MIN = 24
const BAR_MAX = 96

const SIDEBAR_BAR_CONTAINER_H = 32 // px — matches h-8
const SIDEBAR_BAR_MIN = 4
const SIDEBAR_BAR_MAX = 28

const STRIP_BAR_CONTAINER_H = 75 // px
const STRIP_BAR_MIN = 16
const STRIP_BAR_MAX = 64
const STRIP_BAR_W = 8 // px

function chrLengthBp(chr: ChromosomeRow): number {
   return chr.length_bp > 0 ? chr.length_bp : chromosomeSequenceLengthBp(chr.metadata)
}

function formatBp(n: number): string {
   if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Gb`
   if (n >= 1e6) return `${(n / 1e6).toFixed(2)} Mb`
   if (n >= 1e3) return `${(n / 1e3).toFixed(1)} kb`
   return `${n} bp`
}

/** Server-provided JBrowse ref (GET /jbrowse/assemblies/.../context). */
function displayName(chr: ChromosomeRow): string {
   return chr.jbrowse_ref_name?.trim() || '—'
}

function sequenceName(chr: ChromosomeRow): string {
   return chr.metadata && typeof chr.metadata['Sequence-Name'] === 'string'
      ? String(chr.metadata['Sequence-Name']).trim()
      : ''
}

/** Accessible + tooltip copy: primary label, length, accession, optional sequence id. */
function chromosomeAriaLabel(chr: ChromosomeRow): string {
   const name = displayName(chr)
   const friendly = primaryChromosomeLabel(chr.metadata, chr.accession_version)
   const len = formatBp(chrLengthBp(chr))
   const seqId = sequenceName(chr)
   const parts = [
      friendly && friendly !== name ? `${friendly} (${name})` : name,
      len,
      chr.accession_version,
      seqId ? `Seq ${seqId}` : '',
   ].filter(Boolean)
   return parts.join(', ')
}

function ChromosomeTooltipBody({ chr }: { chr: ChromosomeRow }) {
   const name = displayName(chr)
   const friendly = primaryChromosomeLabel(chr.metadata, chr.accession_version)
   const len = formatBp(chrLengthBp(chr))
   const seqId = sequenceName(chr)
   const showBothNames = Boolean(friendly && friendly !== name)

   return (
      <div className="max-w-xs space-y-2 text-left">
         <div>
            {showBothNames ? (
               <>
                  <p className="font-medium">{friendly}</p>
                  <p className="text-background/75 font-mono text-[0.65rem] leading-snug">{name}</p>
               </>
            ) : (
               <p className="font-medium">{name}</p>
            )}
         </div>
         <dl className="grid gap-1 border-t border-background/20 pt-2 text-[0.65rem]">
            <div className="flex justify-between gap-4">
               <dt className="text-background/70 shrink-0">Length</dt>
               <dd className="tabular-nums">{len}</dd>
            </div>
            <div className="flex justify-between gap-4">
               <dt className="text-background/70 shrink-0">Accession</dt>
               <dd className="font-mono text-[0.6rem] break-all text-right">{chr.accession_version}</dd>
            </div>
            {seqId ? (
               <div className="flex justify-between gap-4">
                  <dt className="text-background/70 shrink-0">Sequence</dt>
                  <dd className="break-all text-right">{seqId}</dd>
               </div>
            ) : null}
         </dl>
      </div>
   )
}

export type ChromosomeOverviewProps = {
   chromosomes: ChromosomeRow[]
   selectedAccessionVersions?: string[]
   onSelect?: (chr: ChromosomeRow) => void
   className?: string
   /** `grid` (default) — responsive card grid; `sidebar` — compact single-column list; `strip` — compact horizontal scrollable row. */
   variant?: 'grid' | 'sidebar' | 'strip'
}

/**
 * Responsive chromosome visualisation — two layouts sharing the same scale, selection,
 * and tooltip behaviour.
 */
export function ChromosomeOverview({
   chromosomes,
   selectedAccessionVersions = [],
   onSelect,
   className,
   variant = 'grid',
}: ChromosomeOverviewProps) {
   const maxLen = useMemo(
      () => chromosomes.reduce((m, c) => Math.max(m, chrLengthBp(c)), 0),
      [chromosomes],
   )

   const scale = useMemo(() => {
      const [lo, hi] =
         variant === 'strip'
            ? [STRIP_BAR_MIN, STRIP_BAR_MAX]
            : variant === 'sidebar'
              ? [SIDEBAR_BAR_MIN, SIDEBAR_BAR_MAX]
              : [BAR_MIN, BAR_MAX]
      return scaleLinear().domain([0, maxLen || 1]).range([lo, hi])
   }, [maxLen, variant])

   const selectedSet = useMemo(() => new Set(selectedAccessionVersions), [selectedAccessionVersions])

   if (chromosomes.length === 0) return null

   const stripScrollClass =
      'overflow-x-auto overflow-y-hidden scroll-smooth pb-1.5 [-webkit-overflow-scrolling:touch] [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] snap-x snap-mandatory motion-reduce:snap-none'

   if (variant === 'strip') {
      return (
         <ul
            className={cn(
               stripScrollClass,
               'flex gap-1.5 pt-0.5 pr-1.5',
               // Subtle scroll affordance on supporting engines
               '[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40',
               className,
            )}
            role="list"
            aria-label="Chromosomes — scroll horizontally to see all sequences"
         >
            {chromosomes.map((chr) => {
               const len = chrLengthBp(chr)
               const h = scale(len)
               const name = displayName(chr)
               const selected = selectedSet.has(chr.accession_version)
               const aria = chromosomeAriaLabel(chr)

               const inner = (
                  <div
                     className={cn(
                        'flex shrink-0 snap-start flex-col items-center gap-1.5 rounded-md px-1.5 py-1.5 transition-colors duration-150 motion-safe:transition-transform',
                        selected
                           ? 'bg-primary/15 ring-primary/40 ring-1'
                           : 'hover:bg-muted/70',
                        onSelect && 'cursor-pointer',
                     )}
                  >
                     <div
                        style={{ height: STRIP_BAR_CONTAINER_H, width: STRIP_BAR_W }}
                        className="relative flex items-end justify-center"
                        aria-hidden
                     >
                        <div
                           className={cn(
                              'rounded-sm transition-colors',
                              selected ? 'bg-primary' : 'bg-muted-foreground/50',
                           )}
                           style={{ width: STRIP_BAR_W, height: `${h}px` }}
                        />
                     </div>
                     <span
                        className={cn(
                           'block max-w-[2rem] truncate text-center text-[0.55rem] leading-none',
                           selected ? 'text-primary font-semibold' : 'text-muted-foreground',
                        )}
                     >
                        {name}
                     </span>
                  </div>
               )

               return (
                  <li key={chr.accession_version} className="list-none">
                     <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                           {onSelect ? (
                              <button
                                 type="button"
                                 className="rounded-md outline-none transition-transform active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                 onClick={() => onSelect(chr)}
                                 aria-pressed={selected}
                                 aria-label={aria}
                              >
                                 {inner}
                              </button>
                           ) : (
                              <div>{inner}</div>
                           )}
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6} className="max-w-xs px-3 py-2">
                           <ChromosomeTooltipBody chr={chr} />
                        </TooltipContent>
                     </Tooltip>
                  </li>
               )
            })}
         </ul>
      )
   }

   if (variant === 'sidebar') {
      return (
         <ul className={cn('flex flex-col gap-0.5', className)} role="list">
            {chromosomes.map((chr) => {
               const len = chrLengthBp(chr)
               const h = scale(len)
               const name = displayName(chr)
               const selected = selectedSet.has(chr.accession_version)
               const aria = chromosomeAriaLabel(chr)

               const inner = (
                  <div
                     className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150',
                        selected
                           ? 'bg-primary/12 ring-primary/30 shadow-sm ring-2'
                           : 'hover:bg-muted/60',
                        onSelect && 'cursor-pointer',
                     )}
                  >
                     <div
                        className="relative flex flex-shrink-0 items-end justify-center overflow-hidden rounded-sm bg-muted/40"
                        style={{ width: 8, height: SIDEBAR_BAR_CONTAINER_H }}
                        aria-hidden
                     >
                        <div
                           className={cn(
                              'w-full rounded-sm transition-colors',
                              selected ? 'bg-primary' : 'bg-muted-foreground/50',
                           )}
                           style={{ height: `${h}px` }}
                        />
                     </div>
                     <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium leading-tight text-foreground">
                           {name}
                        </p>
                        <p className="text-[0.6rem] tabular-nums text-muted-foreground">
                           {formatBp(len)}
                        </p>
                     </div>
                  </div>
               )

               return (
                  <li key={chr.accession_version} className="list-none">
                     <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                           {onSelect ? (
                              <button
                                 type="button"
                                 className="w-full rounded-md text-left outline-none transition-transform active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                 onClick={() => onSelect(chr)}
                                 aria-pressed={selected}
                                 aria-label={aria}
                              >
                                 {inner}
                              </button>
                           ) : (
                              <div className="w-full">{inner}</div>
                           )}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={6} className="max-w-xs px-3 py-2">
                           <ChromosomeTooltipBody chr={chr} />
                        </TooltipContent>
                     </Tooltip>
                  </li>
               )
            })}
         </ul>
      )
   }

   return (
      <div className={cn('w-full', className)}>
         <ul
            className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))]"
            role="list"
         >
            {chromosomes.map((chr) => {
               const len = chrLengthBp(chr)
               const h = scale(len)
               const name = displayName(chr)
               const selected = selectedSet.has(chr.accession_version)
               const aria = chromosomeAriaLabel(chr)

               const inner = (
                  <div
                     className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors',
                        selected
                           ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                           : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50',
                        onSelect && 'cursor-pointer',
                     )}
                  >
                     <div
                        className="relative flex h-[5.5rem] w-full items-end justify-center rounded-md bg-muted/20"
                        aria-hidden
                     >
                        <div
                           className={cn(
                              'w-3 rounded-sm transition-colors',
                              selected ? 'bg-primary' : 'bg-muted-foreground/50',
                           )}
                           style={{ height: `${h}px` }}
                        />
                     </div>
                     <span className="line-clamp-2 w-full text-center text-xs font-medium leading-tight text-foreground">
                        {name}
                     </span>
                     <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                        {formatBp(len)}
                     </span>
                  </div>
               )

               return (
                  <li key={chr.accession_version} className="list-none">
                     <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                           {onSelect ? (
                              <button
                                 type="button"
                                 className="w-full rounded-lg text-left outline-none transition-transform active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                 onClick={() => onSelect(chr)}
                                 aria-pressed={selected}
                                 aria-label={aria}
                              >
                                 {inner}
                              </button>
                           ) : (
                              <div className="w-full rounded-lg outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                                 {inner}
                              </div>
                           )}
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6} className="max-w-xs px-3 py-2">
                           <ChromosomeTooltipBody chr={chr} />
                        </TooltipContent>
                     </Tooltip>
                  </li>
               )
            })}
         </ul>
      </div>
   )
}
