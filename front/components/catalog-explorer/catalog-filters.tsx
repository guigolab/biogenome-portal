'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/contexts/locale-context'
import type { ConfigFilter } from '@/lib/portal/types'
import type { FilterValuesState } from '@/lib/catalogQueryParams'
import { pickLocalized } from '@/lib/i18n/pickLocalized'
import { Search } from 'lucide-react'

function filterFieldLabel(def: ConfigFilter, locale: string): string {
   if (def.label) {
      const picked = pickLocalized(def.label, locale, '')
      if (picked) return picked
   }
   return def.key.replace(/\./g, ' · ')
}

export type CatalogFiltersProps = {
   filterDefs: ConfigFilter[] | undefined
   filterValues: Record<string, FilterValuesState | undefined>
   onChange: (key: string, next: FilterValuesState | undefined) => void
   searchValue: string
   onSearchChange: (v: string) => void
   searchPlaceholder: string
   selectOptions: Record<string, string[]>
}

export function CatalogFilters({
   filterDefs,
   filterValues,
   onChange,
   searchValue,
   onSearchChange,
   searchPlaceholder,
   selectOptions,
}: CatalogFiltersProps) {
   const { locale } = useLocale()

   return (
      <div className="space-y-4">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
               className="h-9 pl-9"
               value={searchValue}
               onChange={(e) => onSearchChange(e.target.value)}
               placeholder={searchPlaceholder}
            />
         </div>
         {filterDefs && filterDefs.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
               {filterDefs.map((def) => {
                  const st = filterValues[def.key] ?? {}
                  const id = `cf-${def.key.replace(/[^\w-]+/g, '-')}`
                  const flabel = filterFieldLabel(def, locale)

                  if (def.type === 'input') {
                     return (
                        <div key={def.key} className="space-y-1.5">
                           <Label htmlFor={id} className="text-xs text-muted-foreground">
                              {flabel}
                           </Label>
                           <Input
                              id={id}
                              className="h-9"
                              value={st.text ?? ''}
                              onChange={(e) =>
                                 onChange(def.key, { ...st, text: e.target.value })
                              }
                           />
                        </div>
                     )
                  }

                  if (def.type === 'select') {
                     const opts = selectOptions[def.key] ?? []
                     return (
                        <div key={def.key} className="space-y-1.5">
                           <Label className="text-xs text-muted-foreground">{flabel}</Label>
                           <Select
                              value={st.select ?? 'all'}
                              onValueChange={(v) =>
                                 onChange(def.key, { ...st, select: v === 'all' ? undefined : v })
                              }
                           >
                              <SelectTrigger id={id} className="h-9 w-full">
                                 <SelectValue placeholder="All" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="all">All</SelectItem>
                                 {opts.map((o) => (
                                    <SelectItem key={o} value={o}>
                                       {o}
                                    </SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                     )
                  }

                  if (def.type === 'checkbox') {
                     const tri = st.checkbox === true ? 'true' : st.checkbox === false ? 'false' : 'all'
                     return (
                        <div key={def.key} className="space-y-1.5">
                           <Label className="text-xs text-muted-foreground">{flabel}</Label>
                           <Select
                              value={tri}
                              onValueChange={(v) => {
                                 if (v === 'all') onChange(def.key, { ...st, checkbox: undefined })
                                 else if (v === 'true') onChange(def.key, { ...st, checkbox: true })
                                 else onChange(def.key, { ...st, checkbox: false })
                              }}
                           >
                              <SelectTrigger id={id} className="h-9 w-full">
                                 <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="all">All</SelectItem>
                                 <SelectItem value="true">Yes</SelectItem>
                                 <SelectItem value="false">No</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                     )
                  }

                  if (def.type === 'date') {
                     return (
                        <div key={def.key} className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                           <Label className="text-xs text-muted-foreground">{flabel}</Label>
                           <div className="flex flex-wrap gap-2">
                              <Input
                                 type="date"
                                 className="h-9 max-w-[11rem]"
                                 value={st.date?.from ?? ''}
                                 onChange={(e) =>
                                    onChange(def.key, {
                                       ...st,
                                       date: { ...st.date, from: e.target.value || undefined },
                                    })
                                 }
                              />
                              <span className="self-center text-muted-foreground text-sm">–</span>
                              <Input
                                 type="date"
                                 className="h-9 max-w-[11rem]"
                                 value={st.date?.to ?? ''}
                                 onChange={(e) =>
                                    onChange(def.key, {
                                       ...st,
                                       date: { ...st.date, to: e.target.value || undefined },
                                    })
                                 }
                              />
                           </div>
                        </div>
                     )
                  }

                  return null
               })}
            </div>
         ) : null}
      </div>
   )
}
