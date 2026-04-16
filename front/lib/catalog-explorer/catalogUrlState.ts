import type { FilterValuesState } from '@/lib/catalogQueryParams'
import type { DataModels } from '@/lib/portal/types'
import type { CatalogPageSize } from './useCatalogList'
import { CATALOG_PAGE_SIZE_OPTIONS } from './useCatalogList'

export type CatalogUrlState = {
   catalogKey: DataModels | null
   viewMode: 'table' | 'dashboard'
   pageSize: CatalogPageSize
   filterValues: Record<string, FilterValuesState | undefined>
   /** Taxon scope: exact catalog `taxid` (URL param `tid`). */
   speciesTaxid: string | null
}

function encodeFilterValues(fv: Record<string, FilterValuesState | undefined>): string | null {
   const cleaned: Record<string, FilterValuesState> = {}
   for (const [k, v] of Object.entries(fv)) {
      if (v && (v.text || v.select || v.checkbox != null || v.date?.from || v.date?.to)) {
         cleaned[k] = v
      }
   }
   if (Object.keys(cleaned).length === 0) return null
   try {
      return btoa(encodeURIComponent(JSON.stringify(cleaned)))
   } catch {
      return null
   }
}

function decodeFilterValues(raw: string | null): Record<string, FilterValuesState | undefined> {
   if (!raw) return {}
   try {
      return JSON.parse(decodeURIComponent(atob(raw))) as Record<string, FilterValuesState>
   } catch {
      return {}
   }
}

export function readCatalogUrlState(searchParams: URLSearchParams): Partial<CatalogUrlState> {
   const cat = searchParams.get('cat') as DataModels | null
   const view = searchParams.get('view') === 'dashboard' ? 'dashboard' : 'table'
   const psRaw = Number(searchParams.get('ps'))
   const pageSize = (CATALOG_PAGE_SIZE_OPTIONS as readonly number[]).includes(psRaw)
      ? (psRaw as CatalogPageSize)
      : 50
   const filterValues = decodeFilterValues(searchParams.get('fv'))
   const tid = searchParams.get('tid')?.trim()

   return {
      catalogKey: cat,
      viewMode: view as 'table' | 'dashboard',
      pageSize,
      filterValues,
      speciesTaxid: tid ? tid : null,
   }
}

export function writeCatalogUrlState(state: CatalogUrlState): URLSearchParams {
   const p = new URLSearchParams()
   if (state.catalogKey) p.set('cat', state.catalogKey)
   if (state.viewMode !== 'table') p.set('view', state.viewMode)
   if (state.pageSize !== 50) p.set('ps', String(state.pageSize))
   const fv = encodeFilterValues(state.filterValues)
   if (fv) p.set('fv', fv)
   if (state.speciesTaxid?.trim()) p.set('tid', state.speciesTaxid.trim())
   return p
}
