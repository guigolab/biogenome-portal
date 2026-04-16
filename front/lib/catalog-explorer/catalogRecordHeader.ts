import { getNestedValue } from '@/lib/catalogQueryParams'
import type { DataModels } from '@/lib/portal/types'

function strField(row: Record<string, unknown>, key: string): string {
   const v = row[key]
   return typeof v === 'string' && v.trim() ? v.trim() : ''
}

/** Primary title line — model-specific; default remains scientific name. */
export function cardHeaderTitle(model: DataModels, row: Record<string, unknown>): string {
   switch (model) {
      case 'biosamples':
         return strField(row, 'accession') || '—'
      case 'assemblies': {
         const name = strField(row, 'assembly_name')
         if (name) return name
         return strField(row, 'accession') || '—'
      }
      case 'reads':
         return strField(row, 'run_accession') || '—'
      case 'annotations': {
         const metaAsm = getNestedValue(row, 'metadata.assembly_name')
         if (typeof metaAsm === 'string' && metaAsm.trim()) return metaAsm.trim()
         const topAsm = strField(row, 'assembly_name')
         if (topAsm) return topAsm
         const metaId = getNestedValue(row, 'metadata.annotation_id')
         if (typeof metaId === 'string' && metaId.trim()) return metaId.trim()
         return strField(row, 'name') || '—'
      }
      default: {
         const s = row.scientific_name
         if (typeof s === 'string' && s.trim()) return s.trim()
         return '—'
      }
   }
}

/** Secondary line under title: scientific name for INSDC-style cards; taxid for others. */
export function cardHeaderDescription(model: DataModels, row: Record<string, unknown>): string {
   switch (model) {
      case 'biosamples':
      case 'assemblies':
      case 'reads':
      case 'annotations': {
         const s = row.scientific_name
         return typeof s === 'string' && s.trim() ? s.trim() : '—'
      }
      default: {
         const t = row.taxid
         return t != null && String(t).trim() !== '' ? String(t) : '—'
      }
   }
}

export function useTaxidInDescription(model: DataModels): boolean {
   return (
      model !== 'biosamples' &&
      model !== 'assemblies' &&
      model !== 'reads' &&
      model !== 'annotations'
   )
}
