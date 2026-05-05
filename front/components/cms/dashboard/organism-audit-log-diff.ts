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

export function formatAuditTimestamp(value: unknown): string {
   const raw =
      typeof value === 'string'
         ? value
         : value &&
             typeof value === 'object' &&
             '$date' in value &&
             typeof (value as { $date?: unknown }).$date === 'string'
           ? (value as { $date: string }).$date
           : null
   if (!raw) return 'Unknown date'
   const d = new Date(raw)
   if (Number.isNaN(d.getTime())) return raw
   return d.toLocaleString()
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
