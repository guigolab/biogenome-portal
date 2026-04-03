'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { Navigation } from '@/components/navigation'

/**
 * Global chrome: main nav on public routes; CMS uses its own header under /admin.
 */
export function AppChrome({ children }: { children: ReactNode }) {
   const pathname = usePathname()
   const isAdmin = pathname?.startsWith('/admin') ?? false

   return (
      <div className="flex min-h-dvh max-h-dvh flex-col overflow-hidden">
         {!isAdmin ? <Navigation /> : null}
         <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
            {children}
         </div>
      </div>
   )
}
