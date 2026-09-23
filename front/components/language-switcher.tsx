'use client'

import { Check, Languages } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/contexts/locale-context'
import { getLocaleLabel } from '@/lib/i18n/localeLabels'

export function LanguageSwitcher() {
   const { locale, setLocale, allowedLocales, t } = useLocale()

   if (allowedLocales.length <= 1) return null

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t('nav.menu')}>
               <Languages className="h-4 w-4" />
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
            {allowedLocales.map((code) => (
               <DropdownMenuItem key={code} onClick={() => setLocale(code)} className="gap-2">
                  {locale === code ? <Check className="h-4 w-4 opacity-100" /> : <span className="w-4" />}
                  {getLocaleLabel(code, t)}
               </DropdownMenuItem>
            ))}
         </DropdownMenuContent>
      </DropdownMenu>
   )
}
