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

const localeLabels: Record<string, string> = {
   en: 'English',
   cat: 'Català',
   es: 'Español',
   fr: 'Français',
   de: 'Deutsch',
}

export function LanguageSwitcher() {
   const { locale, setLocale, allowedLocales, t } = useLocale()

   if (allowedLocales.length <= 1) return null

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t('language.english')}>
               <Languages className="h-4 w-4" />
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
            {allowedLocales.map((code) => (
               <DropdownMenuItem key={code} onClick={() => setLocale(code)} className="gap-2">
                  {locale === code ? <Check className="h-4 w-4 opacity-100" /> : <span className="w-4" />}
                  {localeLabels[code] ?? code}
               </DropdownMenuItem>
            ))}
         </DropdownMenuContent>
      </DropdownMenu>
   )
}
