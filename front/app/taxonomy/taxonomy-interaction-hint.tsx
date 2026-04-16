'use client'

import { Info } from 'lucide-react'

import { useLocale } from '@/contexts/locale-context'

/**
 * Floating help for radial tree controls (zoom filter = wheel + dblclick only; click selects nodes).
 */
export function TaxonomyInteractionHint() {
   const { t } = useLocale()

   return (
      <div
         className="border-border bg-card/95 text-card-foreground rounded-lg border px-2.5 py-2 shadow-md backdrop-blur"
         aria-label={t('taxonomy.tree.interactionHintAria')}
      >
         <div className="flex gap-2">
            <Info
               className="text-primary mt-px size-3.5 shrink-0 opacity-80"
               aria-hidden
            />
            <div className="min-w-0 space-y-0.5 text-[0.7rem] leading-snug">
               <p className="text-foreground font-medium">{t('taxonomy.tree.interactionHintTitle')}</p>
               <ul className="text-muted-foreground list-inside list-disc space-y-px">
                  <li>{t('taxonomy.tree.interactionHintClick')}</li>
                  <li>{t('taxonomy.tree.interactionHintZoom')}</li>
                  <li>{t('taxonomy.tree.interactionHintPanel')}</li>
               </ul>
            </div>
         </div>
      </div>
   )
}
