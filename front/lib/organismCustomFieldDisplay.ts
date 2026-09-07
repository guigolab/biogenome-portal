import type { CmsOrganismFieldWire } from '@/lib/portal/types'

export type OrganismCustomFieldRow = {
   key: string
   label: string
   values: string[]
}

/** Normalize a metadata entry (array or string) to a trimmed string array. */
export function readOrganismCustomFieldValues(metadata: unknown, key: string): string[] {
   if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
   const rawValue = (metadata as Record<string, unknown>)[key]
   if (Array.isArray(rawValue)) {
      return rawValue.map((v) => String(v).trim()).filter(Boolean)
   }
   if (rawValue != null && String(rawValue).trim()) {
      return [String(rawValue).trim()]
   }
   return []
}

export function customFieldMetadataKeys(fields: CmsOrganismFieldWire[]): Set<string> {
   return new Set(fields.map((f) => f.key))
}

/** Map config fields to display rows in config order. */
export function organismCustomFieldRows(
   organism: Record<string, unknown>,
   fields: CmsOrganismFieldWire[],
   opts?: { includeEmpty?: boolean },
): OrganismCustomFieldRow[] {
   const includeEmpty = opts?.includeEmpty ?? false
   const metadata = organism.metadata
   const rows: OrganismCustomFieldRow[] = []
   for (const field of fields) {
      const values = readOrganismCustomFieldValues(metadata, field.key)
      if (!includeEmpty && values.length === 0) continue
      rows.push({ key: field.key, label: field.label, values })
   }
   return rows
}
