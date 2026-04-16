'use client'

import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent } from '@/components/ui/card'
import {
   CatalogRecordCardFields,
   CatalogRecordCardHeader,
   CatalogRecordIdentifierRow,
} from '@/components/catalog-explorer/catalog-record-card-chrome'
import type { DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import type { KeyboardEvent } from 'react'

export type CatalogRecordCardProps = {
   model: DataModels
   row: Record<string, unknown>
   active?: boolean
   onClick: () => void
}

export function CatalogRecordCard({ model, row, active, onClick }: CatalogRecordCardProps) {
   const { locale } = useLocale()

   function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
      if (e.key === 'Enter' || e.key === ' ') {
         e.preventDefault()
         onClick()
      }
   }

   return (
      <Card
         role="button"
         tabIndex={0}
         className={cn(
            'cursor-pointer gap-0 p-0 py-0 shadow-sm transition-[box-shadow,border-color]',
            'rounded-xl hover:border-primary/50 hover:shadow-md',
            active && 'border-primary/40 bg-primary/5 ring-1 ring-inset ring-primary/25',
         )}
         onClick={onClick}
         onKeyDown={onKeyDown}
      >
         <CardContent className="space-y-3 p-4">
            <CatalogRecordCardHeader model={model} row={row} locale={locale} />
            <CatalogRecordIdentifierRow model={model} row={row} />
            <CatalogRecordCardFields model={model} row={row} locale={locale} />
         </CardContent>
      </Card>
   )
}
