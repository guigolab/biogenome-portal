import type {
   OrganismCommonName,
   OrganismImageRow,
   OrganismPublication,
} from '@/stores/organism-form-store'
import type { CmsOrganismFieldWire } from '@/lib/portal/types'
import {
   ORGANISM_PRINCIPAL_METADATA_KEYS,
} from '@/lib/organismPrincipalMetadata'

export { ORGANISM_PRINCIPAL_METADATA_KEYS } from '@/lib/organismPrincipalMetadata'

const PRINCIPAL_METADATA_KEY_SET = new Set<string>(ORGANISM_PRINCIPAL_METADATA_KEYS)

/** True when an image row has all fields required for API persistence. */
export function isCompleteImageRow(row: OrganismImageRow): boolean {
   return Boolean(
      row.url?.trim() &&
         row.author?.trim() &&
         row.source_record_url?.trim() &&
         row.license?.trim(),
   )
}

/** True when the row has a URL but is missing other required fields. */
export function isPartialImageRow(row: OrganismImageRow): boolean {
   return Boolean(row.url?.trim()) && !isCompleteImageRow(row)
}

export function getIncompleteImageRowFields(row: OrganismImageRow): string[] {
   const missing: string[] = []
   if (!row.url?.trim()) return missing
   if (!row.author?.trim()) missing.push('author')
   if (!row.source_record_url?.trim()) missing.push('source record URL')
   if (!row.license?.trim()) missing.push('license')
   return missing
}

export function filterCompleteImages(images: OrganismImageRow[]): OrganismImageRow[] {
   return images.filter(isCompleteImageRow)
}

export function filterValidVernacularNames(names: OrganismCommonName[]): OrganismCommonName[] {
   return names.filter((n) => Boolean(n.value?.trim()))
}

/** Trim and drop blank entries from the external links list (`organism.links`). */
export function filterValidLinks(links: string[]): string[] {
   return links.map((l) => l.trim()).filter(Boolean)
}

export function filterValidPublications(publications: OrganismPublication[]): OrganismPublication[] {
   return publications
      .filter((p) => Boolean(p.id?.trim()))
      .map((p) => {
         const out: OrganismPublication = { source: p.source, id: p.id.trim() }
         if (p.data && typeof p.data === 'object') out.data = p.data
         return out
      })
}

/** Build the `genome_publication` payload value: null clears the field, otherwise a trimmed {source, id, data?}. */
export function buildGenomePublicationPayload(
   pub: OrganismPublication | null,
): { source: string; id: string; data?: OrganismPublication['data'] } | null {
   if (!pub || !pub.id?.trim() || !pub.source) return null
   const out: { source: string; id: string; data?: OrganismPublication['data'] } = {
      source: pub.source,
      id: pub.id.trim(),
   }
   if (pub.data && typeof pub.data === 'object') out.data = pub.data
   return out
}

/** Client-side validation status for a single publication (list row or the genome_publication field). */
export type PublicationValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid'

/** True when every publication row with a non-empty id has been validated OK (empty rows are ignored). */
export function allPublicationsValidated(
   publications: OrganismPublication[],
   validation: Record<number, PublicationValidationStatus>,
): boolean {
   return publications.every((p, i) => !p.id?.trim() || validation[i] === 'valid')
}

/** True when the genome_publication field is either empty, or filled and validated OK. */
export function isGenomePublicationValidated(
   pub: OrganismPublication | null,
   status: PublicationValidationStatus,
): boolean {
   if (!pub || !pub.id?.trim()) return true
   return status === 'valid'
}

/** Build metadata object: trim keys, skip blank keys, last duplicate wins.
 * Reserved principal-projection keys are never written from the free-form editor.
 */
export function buildMetadataPayload(metadataList: { key: string; value: string }[]): Record<string, string> {
   const out: Record<string, string> = {}
   for (const { key, value } of metadataList) {
      const k = key.trim()
      if (!k || PRINCIPAL_METADATA_KEY_SET.has(k)) continue
      out[k] = value
   }
   return out
}

/** Build metadata entries for portal-config custom fields (picklists + free text). */
export function buildCustomFieldsMetadata(
   fields: CmsOrganismFieldWire[],
   customFieldValues: Record<string, string[]>,
): Record<string, string | string[]> {
   const out: Record<string, string | string[]> = {}
   for (const field of fields) {
      const selected = (customFieldValues[field.key] ?? []).filter((v) => typeof v === 'string' && v.trim())
      if (selected.length === 0) continue
      out[field.key] = field.type === 'multi' ? selected : selected[0].trim()
   }
   return out
}

/** Split loaded organism metadata into custom picklist values vs free-form metadata rows. */
export function splitLoadedMetadata(
   metadata: Record<string, unknown> | null | undefined,
   customFields: CmsOrganismFieldWire[],
): {
   customFieldValues: Record<string, string[]>
   metadataList: { key: string; value: string }[]
} {
   const customFieldKeys = new Set(customFields.map((f) => f.key))
   const customFieldValues: Record<string, string[]> = {}
   const metadataList: { key: string; value: string }[] = []

   if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return { customFieldValues, metadataList }
   }

   for (const [key, rawValue] of Object.entries(metadata)) {
      if (PRINCIPAL_METADATA_KEY_SET.has(key)) {
         continue
      }
      if (customFieldKeys.has(key)) {
         if (Array.isArray(rawValue)) {
            customFieldValues[key] = rawValue.map((v) => String(v)).filter(Boolean)
         } else if (rawValue != null && String(rawValue).trim()) {
            customFieldValues[key] = [String(rawValue)]
         } else {
            customFieldValues[key] = []
         }
         continue
      }
      metadataList.push({ key, value: rawValue == null ? '' : String(rawValue) })
   }

   return { customFieldValues, metadataList }
}

/** True when all required custom fields for a step have at least one non-blank value. */
export function customFieldsStepComplete(
   fields: CmsOrganismFieldWire[],
   stepId: CmsOrganismFieldWire['step'],
   customFieldValues: Record<string, string[]>,
): boolean {
   const stepFields = fields.filter((f) => f.step === stepId)
   if (stepFields.length === 0) return false
   return stepFields.every((field) => {
      if (!field.required) return true
      return (customFieldValues[field.key] ?? []).some((v) => typeof v === 'string' && v.trim())
   })
}
