export {
   annotationAnnotrieveCardFields,
   annotationCharts,
   annotationExportFields,
   annotationFilters,
   annotationPortalCardFields,
   annotationSortableFields,
   annotationsModelWire,
} from './annotations'
export {
   assemblyCardFields,
   assemblyCharts,
   assemblyExportFields,
   assemblyFilters,
   assemblySortableFields,
   assembliesModelWire,
} from './assemblies'
export {
   biosampleCardFields,
   biosampleCharts,
   biosampleExportFields,
   biosampleFilters,
   biosampleSortableFields,
   biosamplesModelWire,
} from './biosamples'
export {
   localSampleCardFields,
   localSampleExportFields,
   localSampleSortableFields,
   localSamplesModelWire,
} from './local-samples'
export {
   organismCardFields,
   organismExportFields,
   organismSortableFields,
   organismsModelWire,
} from './organisms'
export {
   readsCardFields,
   readsCharts,
   readsExportFields,
   readsFilters,
   readsSortableFields,
   readsModelWire,
} from './reads'

import type { ConfigModelWire, DataModels } from '@/lib/portal/types'
import { assembliesModelWire } from './assemblies'
import { biosamplesModelWire } from './biosamples'
import { readsModelWire } from './reads'
import { annotationsModelWire } from './annotations'

/** NCBI/ENA-derived catalog models: portal.json cannot change filters/charts for these keys. */
export const INSDC_CODE_ONLY_CATALOG_MODEL_KEYS = ['assemblies', 'biosamples', 'reads'] as const
export type InsdcCodeOnlyCatalogDataModel = (typeof INSDC_CODE_ONLY_CATALOG_MODEL_KEYS)[number]

/** `models.local_samples` / `models.annotations` may override card/export in portal.json. */
export const PORTAL_OVERRIDABLE_CATALOG_MODEL_KEYS: readonly DataModels[] = ['local_samples', 'annotations']

/** INSDC models indexed for `normalizeModelsForApp`; annotations is overridable but included here as the base. */
export const defaultInsdcCatalogModels: Pick<
   Record<DataModels, ConfigModelWire>,
   'assemblies' | 'biosamples' | 'reads' | 'annotations'
> = {
   assemblies: assembliesModelWire,
   biosamples: biosamplesModelWire,
   reads: readsModelWire,
   annotations: annotationsModelWire,
}

export { organismsModelWire as defaultOrganismCatalogWire } from './organisms'
export { localSamplesModelWire as defaultLocalSamplesCatalogWire } from './local-samples'
