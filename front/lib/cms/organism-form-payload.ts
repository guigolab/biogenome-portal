import type {
   OrganismCommonName,
   OrganismImageRow,
   OrganismPublication,
} from '@/stores/organism-form-store'

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

export function filterValidPublications(publications: OrganismPublication[]): OrganismPublication[] {
   return publications.filter((p) => Boolean(p.id?.trim()))
}

/** Build the `genome_publication` payload value: null clears the field, otherwise a trimmed {source, id}. */
export function buildGenomePublicationPayload(
   pub: OrganismPublication | null,
): { source: string; id: string } | null {
   if (!pub || !pub.id?.trim() || !pub.source) return null
   return { source: pub.source, id: pub.id.trim() }
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

/** Build metadata object: trim keys, skip blank keys, last duplicate wins. */
export function buildMetadataPayload(metadataList: { key: string; value: string }[]): Record<string, string> {
   const out: Record<string, string> = {}
   for (const { key, value } of metadataList) {
      const k = key.trim()
      if (!k) continue
      out[k] = value
   }
   return out
}
