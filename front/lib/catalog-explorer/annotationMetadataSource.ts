/**
 * Distinguish Annotrieve-ingested genome annotations from portal-uploaded (custom) rows.
 *
 * Annotrieve upserts set `metadata` to the full Annotrieve row (indexed GFF paths, BUSCO,
 * feature stats). Portal `create_annotation` sets `external: false` and typically sparse metadata.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
   return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/**
 * True when metadata matches the Annotrieve payload shape (not merely non-empty).
 */
export function isAnnotrieveStyleMetadata(metadata: unknown): boolean {
   if (!isRecord(metadata)) return false
   const m = metadata

   const idx = m.indexed_file_info
   if (isRecord(idx) && (idx.bgzipped_path != null || idx.csi_path != null)) {
      return true
   }

   if (isRecord(m.features_statistics) && Object.keys(m.features_statistics).length > 0) {
      return true
   }

   if (isRecord(m.features_summary) && Object.keys(m.features_summary).length > 0) {
      return true
   }

   const busco = m.busco
   if (isRecord(busco) && typeof busco.busco_lineage === 'string' && busco.busco_lineage.trim()) {
      return true
   }

   const src = m.source_file_info
   if (isRecord(src) && (src.path != null || src.filename != null)) {
      return true
   }

   return false
}

export type AnnotationRowSource = 'annotrieve' | 'portal_custom' | 'external_other'

/**
 * Classify a catalog / API row (`GenomeAnnotation` as pymongo dict).
 */
export function inferAnnotationRowSource(row: Record<string, unknown>): AnnotationRowSource {
   if (row.external === false) return 'portal_custom'
   if (isAnnotrieveStyleMetadata(row.metadata)) return 'annotrieve'
   return 'external_other'
}
