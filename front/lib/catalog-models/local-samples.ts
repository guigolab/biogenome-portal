import type { CatalogCardFieldDef, ConfigModelWire } from '@/lib/portal/types'

export const localSampleCardFields: CatalogCardFieldDef[] = [
   { key: 'country', section: 'location', icon: 'Globe' },
   { key: 'user', section: 'meta', icon: 'User' },
]

export const localSampleSortableFields: string[] = ['local_id', 'scientific_name', 'taxid']

export const localSampleExportFields: string[] = [
   'scientific_name',
   'taxid',
   'local_id',
   'country',
   'user',
]

export const localSamplesModelWire: ConfigModelWire = {
   label: { en: 'Local samples', cat: 'Mostres locals' },
   filters: [],
   cardFields: localSampleCardFields,
   sortableFields: localSampleSortableFields,
   exportFields: localSampleExportFields,
   charts: [],
}
