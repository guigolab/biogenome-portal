'use client'

import {
   JBrowseLinearGenomeView,
   createViewState,
   type ViewModel,
} from '@jbrowse/react-linear-genome-view2'
import RefGetPlugin from 'jbrowse-plugin-refget-api'
import { reaction } from 'mobx'
import { useTheme } from 'next-themes'
import { AlertCircle } from 'lucide-react'
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { usePortalConfig } from '@/contexts/portal-context'
import type { GenomeAnnotationRow } from '@/lib/api/assemblies'
import type { AssemblyForJBrowse, ChromosomeRow } from '@/lib/genome-browser/buildDefaultSession'
import { buildJBrowseViewStateOptions } from '@/lib/genome-browser/jbrowseConfig'
import { buildJBrowseRootConfiguration } from '@/lib/genome-browser/jbrowsePortalTheme'
import { resolvePortalUiMode } from '@/lib/portal'
import { useAppearanceStore } from '@/stores/appearance-store'
import { pickBrandHexes } from '@/lib/portal/themeApply'
import type { AppConfig } from '@/lib/portal/types'

function makeWorkerInstance() {
   return new Worker(new URL('./jbrowse-rpc-worker.ts', import.meta.url), { type: 'module' })
}

/** LGV only syncs width from the embedded shell; track heights stay at config defaults unless we set them. */
function resizeFeatureTracksToFill(
   viewState: ViewModel,
   containerHeightPx: number,
   opts?: { reservedPx?: number; minPerTrack?: number },
) {
   const reservedPx = opts?.reservedPx ?? 200
   const minPerTrack = opts?.minPerTrack ?? 120
   if (containerHeightPx <= 0) return

   const lgv = viewState.session.view as {
      tracks?: Array<{ type: string; displays?: Array<{ setHeight: (h: number) => void }> }>
   }
   const displays =
      lgv.tracks
         ?.filter((t) => t.type === 'FeatureTrack')
         .map((t) => t.displays?.[0])
         .filter((d): d is { setHeight: (h: number) => void } => typeof d?.setHeight === 'function') ?? []
   if (displays.length === 0) return

   const available = Math.max(minPerTrack, containerHeightPx - reservedPx)
   const each = Math.max(minPerTrack, Math.floor(available / displays.length))
   for (const d of displays) d.setHeight(each)
}

export type JbrowseSelectedChromosome = {
   chr_name: string
   length: number
}

export type JbrowseLinearViewProps = {
   apiBase: string
   /** Human-readable assembly title for annotation track names in the config only. */
   annotationAssemblyDisplayName: string
   assembly: AssemblyForJBrowse
   chromosomes: ChromosomeRow[]
   annotations: GenomeAnnotationRow[]
   defaultSession: Record<string, unknown>
   /** First sorted contig when none selected — keeps first paint aligned with the chromosome strip. */
   defaultChromosomeNav: JbrowseSelectedChromosome | null
   selectedChromosome?: JbrowseSelectedChromosome | null
   /** Called when the embedded LGV navigates to a different primary sequence (sync chromosome strip). */
   onBrowserPrimaryRefName?: (refName: string) => void
}

function JbrowseLinearViewInner({
   apiBase,
   annotationAssemblyDisplayName,
   assembly,
   chromosomes,
   annotations,
   defaultSession,
   defaultChromosomeNav,
   selectedChromosome,
   onBrowserPrimaryRefName,
}: JbrowseLinearViewProps) {
   const { resolvedTheme } = useTheme()
   const appearance = useAppearanceStore((s) => s.appearance)
   const portal = usePortalConfig()
   const [viewState, setViewState] = useState<ViewModel | null>(null)
   /** Bumps only when createViewState runs — remount JBrowse to avoid stale DOM / getElementById(''). */
   const [jbrowseMountGeneration, setJbrowseMountGeneration] = useState(0)
   const trackAreaRef = useRef<HTMLDivElement>(null)

   const assemblyAccession = assembly.accession.trim()
   const annotationTrackAssemblyLabel =
      annotationAssemblyDisplayName.trim() || assembly.assembly_name || assembly.accession

   /** Persisted appearance: fixed light/dark, or system → next-themes. */
   const uiMode = useMemo(
      () => resolvePortalUiMode(appearance, resolvedTheme),
      [appearance, resolvedTheme],
   )
   const brandKey = useMemo(() => {
      const { primary, secondary, accent } = pickBrandHexes(
         (portal?.config ?? {}) as AppConfig,
         portal?.raw ?? null,
      )
      return `${uiMode}|${primary}|${secondary}|${accent}`
   }, [portal?.config, portal?.raw, uiMode])

   const jbrowseRootConfiguration = useMemo(
      () => buildJBrowseRootConfiguration(portal?.config ?? null, portal?.raw ?? null, uiMode),
      [portal?.config, portal?.raw, uiMode],
   )

   const depsKey = useMemo(() => {
      const chrSig = chromosomes.map((c) => ({
         v: c.accession_version,
         ref: c.jbrowse_ref_name,
         len: c.length_bp,
      }))
      const annSig = annotations.map((a) => ({
         n: a.name,
         g: a.gff_gz_location,
         t: a.tab_index_location,
      }))
      return JSON.stringify({
         apiBase,
         accession: assembly.accession,
         assemblyAccession,
         chrSig,
         annSig,
         defaultSession,
         brandKey,
      })
   }, [apiBase, assembly.accession, assemblyAccession, chromosomes, annotations, defaultSession, brandKey])

   useEffect(() => {
      if (!assembly.accession || chromosomes.length === 0) {
         setViewState(null)
         return
      }
      if (!annotations.length || !assemblyAccession) {
         setViewState(null)
         return
      }

      const { assembly: asmCfg, tracks } = buildJBrowseViewStateOptions(
         apiBase,
         assembly,
         assemblyAccession,
         annotationTrackAssemblyLabel,
         chromosomes,
         annotations,
      )

      if (!tracks.length) {
         setViewState(null)
         return
      }

      const state = createViewState({
         assembly: asmCfg,
         tracks: [...tracks],
         configuration: jbrowseRootConfiguration,
         defaultSession: defaultSession as never,
         plugins: [RefGetPlugin],
         makeWorkerInstance,
      })
      setViewState(state)
      setJbrowseMountGeneration((g) => g + 1)
   }, [depsKey, jbrowseRootConfiguration])

   /** Keep parent chromosome list aligned with whatever contig the LGV is actually showing. */
   useEffect(() => {
      if (!viewState || !onBrowserPrimaryRefName) return
      const dispose = reaction(
         () => {
            const view = viewState.session.view as { displayedRegions?: Array<{ refName?: string }> }
            const dr = view.displayedRegions
            if (!dr?.length) return ''
            return String(dr[0]?.refName ?? '').trim()
         },
         (refName) => {
            if (refName) onBrowserPrimaryRefName(refName)
         },
         { fireImmediately: true },
      )
      return dispose
   }, [viewState, onBrowserPrimaryRefName])

   /** Chromosome rows can load after the view; push the current ref again so the strip can match. */
   useEffect(() => {
      if (!viewState || !onBrowserPrimaryRefName || chromosomes.length === 0) return
      const view = viewState.session.view as { displayedRegions?: Array<{ refName?: string }> }
      const refName = String(view.displayedRegions?.[0]?.refName ?? '').trim()
      if (refName) onBrowserPrimaryRefName(refName)
   }, [chromosomes, viewState, onBrowserPrimaryRefName])

   /**
    * Defer nav until after the linear view has committed DOM (avoids MUI/JBrowse looking up ids before mount).
    * When nothing is selected, follow `defaultChromosomeNav` (first sorted contig) so the header matches the strip.
    * Skips if the view already shows that sequence (avoids fighting browser-driven navigation).
    */
   useEffect(() => {
      if (!viewState || !assemblyAccession) return
      const target = selectedChromosome ?? defaultChromosomeNav
      const ref = target?.chr_name?.trim()
      if (!ref) return

      const len = target?.length && target.length > 0 ? target.length : 1_000_000
      const windowEnd = Math.min(100_000, len)
      let cancelled = false

      const run = () => {
         if (cancelled) return
         try {
            const view = viewState.session.view as {
               displayedRegions?: Array<{ refName?: string }>
               navToLocString?: (loc: string, assembly: string) => void
            }
            const current = String(view.displayedRegions?.[0]?.refName ?? '').trim()
            if (current && ref && current.toLowerCase() === ref.toLowerCase()) return
            view.navToLocString?.(`${ref}:1-${windowEnd}`, assemblyAccession)
         } catch (e) {
            console.error('JBrowse navToLocString:', e)
         }
      }

      const id0 = requestAnimationFrame(() => {
         requestAnimationFrame(run)
      })

      return () => {
         cancelled = true
         cancelAnimationFrame(id0)
      }
   }, [selectedChromosome, defaultChromosomeNav, viewState, assemblyAccession])

   useLayoutEffect(() => {
      if (!viewState) return
      const el = trackAreaRef.current
      if (!el) return

      const apply = () => {
         const h = el.getBoundingClientRect().height
         resizeFeatureTracksToFill(viewState, h)
      }

      const ro = new ResizeObserver((entries) => {
         const h = entries[0]?.contentRect.height ?? 0
         resizeFeatureTracksToFill(viewState, h)
      })
      ro.observe(el)
      apply()
      const id = requestAnimationFrame(() => requestAnimationFrame(apply))
      return () => {
         cancelAnimationFrame(id)
         ro.disconnect()
      }
   }, [viewState, jbrowseMountGeneration])

   if (!assembly.accession || chromosomes.length === 0) {
      return null
   }

   if (!annotations.length) {
      return (
         <p className="py-8 text-center text-sm text-muted-foreground">
            No annotations with GFF locations for this assembly.
         </p>
      )
   }

   if (!viewState) {
      return (
         <div className="flex h-full w-full min-h-[14rem] flex-1 items-center justify-center">
            <div className="text-center">
               <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
               <p className="text-sm text-muted-foreground">Initializing genome browser…</p>
            </div>
         </div>
      )
   }

   const isRefSeqAssembly = assembly.accession.startsWith('GCF_')

   return (
      <div className="flex h-full w-full min-h-0 flex-1 flex-col gap-3">
         {isRefSeqAssembly ? (
            <div className="flex shrink-0 items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
               <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-500" />
               <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm font-medium text-yellow-800 dark:text-yellow-200">
                     RefSeq assembly detected
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                     RefGet is aimed at INSDC sequence accessions; some RefSeq (GCF_) assemblies may have
                     limited sequence support.
                  </p>
               </div>
            </div>
         ) : null}
         {/* Observed height → distribute to FeatureTrack displays (embedded LGV has no setHeight on the view). */}
         <div ref={trackAreaRef} className="min-h-0 flex-1 overflow-hidden">
            <JBrowseLinearGenomeView
               key={`${assembly.accession}-${jbrowseMountGeneration}`}
               viewState={viewState}
            />
         </div>
      </div>
   )
}

export const JbrowseLinearView = memo(JbrowseLinearViewInner)
