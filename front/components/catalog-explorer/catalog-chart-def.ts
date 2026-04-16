import type { ChartType } from '@/lib/portal/types'

export type CatalogChartDef = {
   field: string
   type: ChartType
   size: number
   xField?: string
   yField?: string
   colorField?: string
}
