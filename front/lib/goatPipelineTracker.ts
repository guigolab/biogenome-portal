import type { CSSProperties } from 'react'
import type { GoatChipState } from '@/lib/organismStatusLabels'
import { GOAT_PIPELINE_STEPS, TARGET_LIST_STATUS_VALUES } from '@/lib/organismStatusLabels'

/** Stage colors (hex) in pipeline order — matches GoaT sequencing ladder. */
export const GOAT_PIPELINE_TRACKER_COLORS = [
   '#888780',
   '#1D9E75',
   '#378ADD',
   '#7F77DD',
   '#EF9F27',
   '#D85A30',
   '#639922',
] as const

/** Aligns with `TARGET_LIST_STATUS_VALUES` order (No Entry, long_list, family_representative, other_priority). */
export const TARGET_LIST_CHIP_COLORS = ['#64748b', '#2563eb', '#a855f7', '#ea580c'] as const

export function targetListStatusColorIndex(value: string): number {
   const i = TARGET_LIST_STATUS_VALUES.indexOf(value as (typeof TARGET_LIST_STATUS_VALUES)[number])
   return i >= 0 ? i : 0
}

/** Row ladder chips: same hex ladder as the tracker; `completed` / `current` / `todo` variants. */
export function goatPipelineChipStyles(state: GoatChipState, stepIndex: number): CSSProperties {
   const hex = GOAT_PIPELINE_TRACKER_COLORS[stepIndex] ?? '#888780'
   switch (state) {
      case 'completed':
         return {
            backgroundColor: `${hex}3d`,
            borderColor: hex,
            color: 'inherit',
         }
      case 'current':
         return {
            backgroundColor: hex,
            borderColor: hex,
            color: '#ffffff',
         }
      default:
         return {
            borderColor: 'hsl(var(--border))',
            backgroundColor: 'transparent',
            opacity: 0.55,
         }
   }
}

/** Short display labels for the tracker UI (sentence case per design spec). */
export const GOAT_PIPELINE_TRACKER_LABELS = [
   'Missing status',
   'Sample collected',
   'Sample acquired',
   'Data generation',
   'In assembly',
   'INSDC submitted',
   'Publication available',
] as const

export type GoatTrackerStage = {
   key: string
   label: string
   count: number
   pct: number
   color: string
   desc: string
}

/** Hex color for a stored `goat_status` value — same index as `GOAT_PIPELINE_STEPS` / tracker bar. */
export function goatStatusTrackerColorHex(value: string): string {
   const i = GOAT_PIPELINE_STEPS.findIndex((s) => s.value === value)
   const idx = i >= 0 ? i : 0
   return GOAT_PIPELINE_TRACKER_COLORS[idx] ?? GOAT_PIPELINE_TRACKER_COLORS[0]
}

/** Filled badge style matching tracker stage swatches (white text on stage color). */
export function goatStatusTrackerBadgeStyle(value: string): CSSProperties {
   const hex = goatStatusTrackerColorHex(value)
   return {
      backgroundColor: hex,
      borderColor: hex,
      color: '#ffffff',
   }
}

export function buildGoatTrackerStages(
   goatStats: Record<string, number> | null | undefined,
): { stages: GoatTrackerStage[]; total: number } {
   const stages: GoatTrackerStage[] = GOAT_PIPELINE_STEPS.map((st, i) => {
      const count = goatStats?.[st.value] ?? 0
      return {
         key: st.value,
         label: GOAT_PIPELINE_TRACKER_LABELS[i] ?? st.label,
         count,
         pct: 0,
         color: GOAT_PIPELINE_TRACKER_COLORS[i] ?? '#888780',
         desc: st.description,
      }
   })
   const total = stages.reduce((s, x) => s + x.count, 0)
   for (const st of stages) {
      st.pct = total > 0 ? Math.round((st.count / total) * 100) : 0
   }
   return { stages, total }
}
