'use client'

import { Check, Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/contexts/locale-context'
import type { PortalAppearance } from '@/stores/appearance-store'
import { useAppearanceStore } from '@/stores/appearance-store'

const options: { value: PortalAppearance; icon: typeof Sun }[] = [
   { value: 'light', icon: Sun },
   { value: 'dark', icon: Moon },
   { value: 'system', icon: Monitor },
]

export function AppearanceSwitcher() {
   const { t } = useLocale()
   const appearance = useAppearanceStore((s) => s.appearance)
   const setAppearance = useAppearanceStore((s) => s.setAppearance)

   const active = options.find((o) => o.value === appearance) ?? options[2]
   const ActiveIcon = active.icon

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button
               variant="ghost"
               size="icon"
               className="h-9 w-9"
               type="button"
               aria-label={t('appearance.label')}
            >
               <ActiveIcon className="h-4 w-4" />
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
            {options.map(({ value, icon: Icon }) => (
               <DropdownMenuItem
                  key={value}
                  onClick={() => setAppearance(value)}
                  className="gap-2"
               >
                  {appearance === value ? (
                     <Check className="h-4 w-4 opacity-100" />
                  ) : (
                     <span className="w-4" />
                  )}
                  <Icon className="h-4 w-4 opacity-70" />
                  {t(`appearance.${value}`)}
               </DropdownMenuItem>
            ))}
         </DropdownMenuContent>
      </DropdownMenu>
   )
}
