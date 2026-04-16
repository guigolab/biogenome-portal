import { catalogColumnHeaderLabel } from '@/lib/catalog-explorer/catalogColumnLabels'
import { inferAnnotationRowSource } from '@/lib/catalog-explorer/annotationMetadataSource'
import { formatCatalogCardCellValue, getNestedValue } from '@/lib/catalogQueryParams'
import type { CatalogCardFieldDef, DataModels } from '@/lib/portal/types'
import {
   annotationAnnotrieveCardFields,
   annotationPortalCardFields,
   assemblyCardFields,
   biosampleCardFields,
   localSampleCardFields,
   readsCardFields,
   assemblySortableFields,
   biosampleSortableFields,
   readsSortableFields,
   annotationSortableFields,
   localSampleSortableFields,
   assemblyExportFields,
   biosampleExportFields,
   readsExportFields,
   annotationExportFields,
   localSampleExportFields,
} from '@/lib/catalog-models'

// Re-export card field arrays so existing importers keep working.
export {
   assemblyCardFields,
   biosampleCardFields,
   readsCardFields,
   annotationAnnotrieveCardFields,
   localSampleCardFields as localSamplesDefaultCardFields,
}

export function isReferenceGenomeCategory(value: unknown): boolean {
   if (value == null) return false
   const n = String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
   return n === 'reference_genome'
}

export type CatalogHeaderBadge = {
   /** Row field to omit from card body when shown as badge. */
   fieldKey: string
   /** Localized display name (same as card detail row label). */
   label: string
   /** Formatted cell value. */
   value: string
   icon: string
   /**
    * When 'icon-only', the badge renders as a compact icon pill with a tooltip instead of the
    * two-row label + value block. Used for assembly reference genome indicator.
    */
   variant?: 'icon-only'
}

/**
 * Right-side header badge per catalog model (location / strategy / BUSCO / RefSeq reference).
 * When non-null, {@link getCatalogCardFieldsForModel} drops {@link CatalogHeaderBadge.fieldKey} from the body.
 */
export function resolveCatalogHeaderBadge(
   model: DataModels,
   row: Record<string, unknown>,
   locale: string,
): CatalogHeaderBadge | null {
   switch (model) {
      case 'biosamples': {
         const candidates: { key: string; icon: string }[] = [
            { key: 'metadata.geographic location (country and/or sea)', icon: 'Globe' },
            { key: 'metadata.habitat', icon: 'Trees' },
            { key: 'metadata.geographic location (region and locality)', icon: 'MapPin' },
            { key: 'metadata.geo_loc_name', icon: 'Globe' },
         ]
         for (const { key, icon } of candidates) {
            const raw = resolveCatalogCardValue('biosamples', key, row)
            const value = formatCatalogCardCellValue(raw)
            if (!value || value === '—') continue
            return {
               fieldKey: key,
               label: catalogColumnHeaderLabel('biosamples', key, locale),
               value,
               icon,
            }
         }
         return null
      }
      case 'assemblies': {
         const refKey = 'metadata.assembly_info.refseq_category'
         const refseq = getNestedValue(row, refKey)
         if (!isReferenceGenomeCategory(refseq)) return null
         return {
            fieldKey: refKey,
            label: 'Reference genome',
            value: formatCatalogCardCellValue(refseq),
            icon: 'Star',
            variant: 'icon-only',
         }
      }
      case 'reads': {
         const key = 'metadata.library_strategy'
         const raw = getNestedValue(row, key)
         const value = formatCatalogCardCellValue(raw)
         if (!value || value === '—') return null
         return {
            fieldKey: key,
            label: catalogColumnHeaderLabel('reads', key, locale),
            value,
            icon: 'Library',
         }
      }
      case 'annotations': {
         if (inferAnnotationRowSource(row) !== 'annotrieve') return null
         const key = 'metadata.busco.complete'
         const raw = getNestedValue(row, key)
         const value = formatCatalogCardCellValue(raw)
         if (!value || value === '—') return null
         return {
            fieldKey: key,
            label: catalogColumnHeaderLabel('annotations', key, locale),
            value,
            icon: 'Gauge',
         }
      }
      default:
         return null
   }
}

/** API field used as the record id in the card header (badge line). */
export function catalogIdentifierField(model: DataModels): string {
   switch (model) {
      case 'assemblies':
         return 'accession'
      case 'biosamples':
         return 'accession'
      case 'reads':
         return 'run_accession'
      case 'annotations':
         return 'name'
      case 'local_samples':
         return 'local_id'
      default:
         return 'taxid'
   }
}

/** Resolve a cell value; biosample collection date tries document + metadata keys. */
export function resolveCatalogCardValue(
   model: DataModels,
   fieldKey: string,
   row: Record<string, unknown>,
): unknown {
   if (model === 'biosamples' && fieldKey === 'collection_date') {
      const direct = row.collection_date
      if (direct != null && String(direct).trim() !== '') return direct
      const a = getNestedValue(row, 'metadata.collection date')
      if (a != null && String(a).trim() !== '') return a
      return getNestedValue(row, 'metadata.collection_date')
   }
   return getNestedValue(row, fieldKey)
}

/** Card body fields for list rendering (header layout is model-specific in `CatalogRecordCard`; optional right badge). */
export function getCatalogCardFieldsForModel(
   model: DataModels,
   row?: Record<string, unknown>,
   locale?: string,
): CatalogCardFieldDef[] {
   let fields: CatalogCardFieldDef[]
   switch (model) {
      case 'assemblies':
         fields = assemblyCardFields
         break
      case 'biosamples':
         fields = biosampleCardFields
         break
      case 'reads':
         fields = readsCardFields
         break
      case 'annotations':
         if (!row) {
            fields = annotationAnnotrieveCardFields
         } else {
            fields =
               inferAnnotationRowSource(row) === 'annotrieve'
                  ? annotationAnnotrieveCardFields
                  : annotationPortalCardFields
         }
         break
      case 'local_samples':
         fields = localSampleCardFields
         break
      default:
         return []
   }
   if (row) {
      const badge = resolveCatalogHeaderBadge(model, row, locale ?? 'en')
      if (badge) {
         fields = fields.filter((f) => f.key !== badge.fieldKey)
      }
   }

   /** Badge-only keys: show in the header badge when valid, never as a body row (even when empty). */
   if (row && model === 'annotations' && inferAnnotationRowSource(row) === 'annotrieve') {
      fields = fields.filter((f) => f.key !== 'metadata.busco.complete')
   }
   if (row && model === 'reads') {
      fields = fields.filter((f) => f.key !== 'metadata.library_strategy')
   }

   return fields
}

/** Default sortable API fields per catalog model (subset of list API sort_column support). */
export const defaultCatalogSortableFields: Partial<Record<DataModels, string[]>> = {
   assemblies: assemblySortableFields,
   biosamples: biosampleSortableFields,
   reads: readsSortableFields,
   annotations: annotationSortableFields,
   local_samples: localSampleSortableFields,
}

/** Default TSV export field paths per catalog model. */
export function defaultCatalogExportFields(model: DataModels): string[] {
   switch (model) {
      case 'assemblies':
         return assemblyExportFields
      case 'biosamples':
         return biosampleExportFields
      case 'reads':
         return readsExportFields
      case 'annotations':
         return annotationExportFields
      case 'local_samples':
         return localSampleExportFields
      default:
         return ['scientific_name', 'taxid']
   }
}
