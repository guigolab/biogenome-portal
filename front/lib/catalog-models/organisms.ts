import type { CatalogCardFieldDef, ConfigModelWire } from '@/lib/portal/types'

export const organismCardFields: CatalogCardFieldDef[] = [
   { key: 'image', section: 'meta', icon: 'Image' },
]

export const organismSortableFields: string[] = ['taxid', 'scientific_name']

export const organismExportFields: string[] = ['taxid', 'scientific_name', 'image', 'insdc_common_name']

export const organismsModelWire: ConfigModelWire = {
   label: { en: 'Organisms', cat: 'Organismes' },
   filters: [],
   cardFields: organismCardFields,
   sortableFields: organismSortableFields,
   exportFields: organismExportFields,
   charts: [],
}
