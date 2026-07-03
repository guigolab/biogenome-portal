import { labelGoatStatus, labelTargetListStatus } from '@/lib/organismStatusLabels'

/** Editable GoaT pipeline steps (aligned with organism-form-client). */
export const SELECTABLE_GOAT_STATUSES = [
   'Sample Collected',
   'Sample Acquired',
   'Data Generation',
   'In Assembly',
] as const

export type SelectableGoatStatus = (typeof SELECTABLE_GOAT_STATUSES)[number]

export const TERMINAL_GOAT_STATUSES = ['INSDC Submitted', 'Publication Available'] as const

export const TARGET_LIST_OPTIONS = [
   { key: 'long_list' as const, label: 'Long list' },
   { key: 'family_representative' as const, label: 'Family representative' },
   { key: 'other_priority' as const, label: 'Other priority' },
] as const

export type TargetListStatusKey = (typeof TARGET_LIST_OPTIONS)[number]['key']

const GOAT_UNSET_SENTINEL = '__unset__'

export function normalizeGoatStatusStored(raw: unknown): string | null {
   if (raw === null || raw === undefined) return null
   if (typeof raw !== 'string') return null
   const trimmed = raw.trim()
   return trimmed || null
}

export function isGoatStatusUnset(raw: unknown): boolean {
   return normalizeGoatStatusStored(raw) === null
}

export function goatStatusValuesEqual(a: unknown, b: unknown): boolean {
   return normalizeGoatStatusStored(a) === normalizeGoatStatusStored(b)
}

export function isGoatStatusLocked(status: unknown): boolean {
   const normalized = normalizeGoatStatusStored(status)
   if (!normalized) return false
   return (TERMINAL_GOAT_STATUSES as readonly string[]).includes(normalized)
}

export function isGoatStatusEditable(status: unknown): boolean {
   const normalized = normalizeGoatStatusStored(status)
   if (!normalized) return true
   if (isGoatStatusLocked(normalized)) return false
   return (SELECTABLE_GOAT_STATUSES as readonly string[]).includes(normalized)
}

/** Select value for GoaT column; unset stored values use a UI-only sentinel. */
export function goatStatusToSelectValue(raw: unknown): string {
   const stored = normalizeGoatStatusStored(raw)
   if (!stored) return GOAT_UNSET_SENTINEL
   return stored
}

export function goatStatusFromSelectValue(selected: string): string | null {
   if (selected === GOAT_UNSET_SENTINEL) return null
   return selected
}

export function normalizeTargetListStatusForSelect(raw: unknown): TargetListStatusKey {
   if (typeof raw === 'string' && TARGET_LIST_OPTIONS.some((t) => t.key === raw)) {
      return raw as TargetListStatusKey
   }
   return 'long_list'
}

export function labelGoatStatusForSelect(value: string): string {
   if (value === GOAT_UNSET_SENTINEL) return 'No status'
   return labelGoatStatus(value)
}

export function labelTargetListStatusForSelect(value: string): string {
   const option = TARGET_LIST_OPTIONS.find((t) => t.key === value)
   return option?.label ?? labelTargetListStatus(value)
}
