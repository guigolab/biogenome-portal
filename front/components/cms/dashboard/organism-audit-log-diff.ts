import { formatDistanceToNow } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import {
   CircleDot,
   Minus,
   Pencil,
   Plus,
   RefreshCcw,
   ShieldAlert,
   ShieldCheck,
   Trash2,
} from 'lucide-react'

import type { CmsOrganismAuditLogRow } from '@/lib/cms/services/auth'

export type AuditChangeType = 'added' | 'removed' | 'updated'

export type OrganismAuditFieldChange = {
   path: string
   type: AuditChangeType
   before: unknown
   after: unknown
}

export type OrganismAuditChangeSection = {
   id: string
   label: string
   changes: OrganismAuditFieldChange[]
}

type FlatMap = Map<string, unknown>

function isPlainObject(value: unknown): value is Record<string, unknown> {
   return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function flattenIntoMap(value: unknown, out: FlatMap, prefix = ''): void {
   if (Array.isArray(value)) {
      if (value.length === 0 && prefix) out.set(prefix, [])
      value.forEach((item, idx) => {
         const nextPath = prefix ? `${prefix}.${idx}` : String(idx)
         flattenIntoMap(item, out, nextPath)
      })
      return
   }
   if (isPlainObject(value)) {
      const keys = Object.keys(value)
      if (keys.length === 0 && prefix) out.set(prefix, {})
      keys.forEach((key) => {
         const nextPath = prefix ? `${prefix}.${key}` : key
         flattenIntoMap(value[key], out, nextPath)
      })
      return
   }
   out.set(prefix || 'root', value)
}

function toFlatMap(value: unknown): FlatMap {
   const map = new Map<string, unknown>()
   if (value === null || value === undefined) return map
   flattenIntoMap(value, map)
   return map
}

function sameValue(a: unknown, b: unknown): boolean {
   if (a === b) return true
   return JSON.stringify(a) === JSON.stringify(b)
}

export function buildOrganismAuditFieldDiff(
   previousObject: Record<string, unknown> | null | undefined,
   newObject: Record<string, unknown> | null | undefined,
): OrganismAuditFieldChange[] {
   const before = toFlatMap(previousObject)
   const after = toFlatMap(newObject)
   const keys = new Set([...before.keys(), ...after.keys()])
   const changes: OrganismAuditFieldChange[] = []
   keys.forEach((path) => {
      const hasBefore = before.has(path)
      const hasAfter = after.has(path)
      const prev = before.get(path)
      const next = after.get(path)
      if (hasBefore && !hasAfter) {
         changes.push({ path, type: 'removed', before: prev, after: undefined })
         return
      }
      if (!hasBefore && hasAfter) {
         changes.push({ path, type: 'added', before: undefined, after: next })
         return
      }
      if (!sameValue(prev, next)) {
         changes.push({ path, type: 'updated', before: prev, after: next })
      }
   })
   return changes.sort((a, b) => a.path.localeCompare(b.path))
}

export function parseAuditTimestamp(value: unknown): Date | null {
   const raw =
      typeof value === 'string'
         ? value
         : value &&
             typeof value === 'object' &&
             '$date' in value &&
             typeof (value as { $date?: unknown }).$date === 'string'
           ? (value as { $date: string }).$date
           : null
   if (!raw) return null
   const d = new Date(raw)
   if (Number.isNaN(d.getTime())) return null
   return d
}

export function parseAuditObjectId(value: unknown): string | null {
   if (typeof value === 'string' && value.trim()) return value.trim()
   if (
      value &&
      typeof value === 'object' &&
      '$oid' in value &&
      typeof (value as { $oid?: unknown }).$oid === 'string'
   ) {
      return (value as { $oid: string }).$oid
   }
   return null
}

export function formatAuditTimestamp(value: unknown): string {
   const d = parseAuditTimestamp(value)
   if (!d) {
      if (typeof value === 'string') return value
      return 'Unknown date'
   }
   return d.toLocaleString()
}

export function formatRelativeAuditTimestamp(value: unknown): string {
   const d = parseAuditTimestamp(value)
   if (!d) return 'Unknown date'
   return formatDistanceToNow(d, { addSuffix: true })
}

export type AuditActionMeta = {
   label: string
   Icon: LucideIcon
   badgeClassName: string
   dotClassName: string
}

export const ORGANISM_AUDIT_ACTIONS = [
   'create',
   'update',
   'patch',
   'delete',
   'request_deletion',
   'deny_deletion',
] as const

export type OrganismAuditAction = (typeof ORGANISM_AUDIT_ACTIONS)[number]

const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
   create: {
      label: 'Created',
      Icon: Plus,
      badgeClassName:
         'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      dotClassName: 'bg-emerald-500',
   },
   update: {
      label: 'Updated',
      Icon: Pencil,
      badgeClassName: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400',
      dotClassName: 'bg-sky-500',
   },
   patch: {
      label: 'Patched',
      Icon: RefreshCcw,
      badgeClassName: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
      dotClassName: 'bg-amber-500',
   },
   delete: {
      label: 'Deleted',
      Icon: Trash2,
      badgeClassName: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
      dotClassName: 'bg-rose-500',
   },
   request_deletion: {
      label: 'Deletion requested',
      Icon: ShieldAlert,
      badgeClassName: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400',
      dotClassName: 'bg-orange-500',
   },
   deny_deletion: {
      label: 'Deletion denied',
      Icon: ShieldCheck,
      badgeClassName: 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-400',
      dotClassName: 'bg-teal-500',
   },
}

const DEFAULT_AUDIT_ACTION_META: AuditActionMeta = {
   label: 'Changed',
   Icon: CircleDot,
   badgeClassName: 'border-border bg-muted/50 text-muted-foreground',
   dotClassName: 'bg-muted-foreground',
}

export function getAuditActionMeta(action: string): AuditActionMeta {
   const key = action.trim().toLowerCase()
   const known = AUDIT_ACTION_META[key]
   if (known) return known
   const label = action.replace(/_/g, ' ')
   return {
      ...DEFAULT_AUDIT_ACTION_META,
      label: label ? label.charAt(0).toUpperCase() + label.slice(1) : DEFAULT_AUDIT_ACTION_META.label,
   }
}

export type AuditChangeTypeMeta = {
   label: string
   Icon: LucideIcon
   badgeClassName: string
   addedBlockClassName: string
   removedBlockClassName: string
}

export const AUDIT_CHANGE_TYPE_META: Record<AuditChangeType, AuditChangeTypeMeta> = {
   added: {
      label: 'Added',
      Icon: Plus,
      badgeClassName:
         'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      addedBlockClassName:
         'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
      removedBlockClassName: '',
   },
   removed: {
      label: 'Removed',
      Icon: Minus,
      badgeClassName: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
      addedBlockClassName: '',
      removedBlockClassName: 'border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100',
   },
   updated: {
      label: 'Updated',
      Icon: Pencil,
      badgeClassName: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400',
      addedBlockClassName:
         'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
      removedBlockClassName: 'border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100',
   },
}

export function formatAuditValue(value: unknown): string {
   if (value === null || value === undefined) return '—'
   if (typeof value === 'string') return value
   if (typeof value === 'number' || typeof value === 'boolean') return String(value)
   try {
      return JSON.stringify(value, null, 2)
   } catch {
      return String(value)
   }
}

export function getAuditLogChanges(log: CmsOrganismAuditLogRow): OrganismAuditFieldChange[] {
   return buildOrganismAuditFieldDiff(log.previous_object ?? null, log.new_object ?? null)
}

const SECTION_LABELS: Record<string, string> = {
   common_names: 'Common Names',
   publications: 'Publications',
   genome_publication: 'Genome Publication',
   images: 'Images',
   lineage_rank_labels: 'Lineage Rank Labels',
   iucn_redlist: 'IUCN Red List',
   metadata: 'Metadata',
}

function sectionForPath(path: string): { id: string; label: string } {
   const root = path.split('.')[0] ?? 'core'
   if (SECTION_LABELS[root]) return { id: root, label: SECTION_LABELS[root] }
   return { id: 'core', label: 'Core Fields' }
}

export function groupAuditChangesBySection(
   changes: OrganismAuditFieldChange[],
): OrganismAuditChangeSection[] {
   const bySection = new Map<string, OrganismAuditChangeSection>()
   for (const change of changes) {
      const { id, label } = sectionForPath(change.path)
      const section = bySection.get(id) ?? { id, label, changes: [] }
      section.changes.push(change)
      bySection.set(id, section)
   }
   const sections = Array.from(bySection.values())
   sections.forEach((section) => {
      section.changes.sort((a, b) => a.path.localeCompare(b.path))
   })
   return sections.sort((a, b) => {
      if (a.id === 'core') return -1
      if (b.id === 'core') return 1
      return a.label.localeCompare(b.label)
   })
}

export function getAuditLogChangeSections(log: CmsOrganismAuditLogRow): OrganismAuditChangeSection[] {
   return groupAuditChangesBySection(getAuditLogChanges(log))
}
