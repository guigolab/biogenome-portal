'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { Navigation } from '@/components/navigation'
import { cn } from '@/lib/utils'

/**
 * Global chrome: main nav on public routes; CMS uses its own header under /admin.
 */
export function AppChrome({ children }: { children: ReactNode }) {
   const pathname = usePathname()
   const isAdmin = pathname?.startsWith('/admin') ?? false
   /** Full-viewport tool UIs manage their own scroll regions; avoid double page scroll. */
   const lockDocumentScroll =
      pathname === '/species' ||
      pathname === '/catalog' ||
      pathname === '/genome-browser' ||
      pathname === '/taxonomy'

   useEffect(() => {
      if (!lockDocumentScroll) return
      const html = document.documentElement
      const body = document.body
      const prevHtmlOverflow = html.style.overflow
      const prevBodyOverflow = body.style.overflow
      const prevHtmlOverscroll = html.style.overscrollBehaviorY
      const prevBodyOverscroll = body.style.overscrollBehaviorY
      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      html.style.overscrollBehaviorY = 'none'
      body.style.overscrollBehaviorY = 'none'
      return () => {
         html.style.overflow = prevHtmlOverflow
         body.style.overflow = prevBodyOverflow
         html.style.overscrollBehaviorY = prevHtmlOverscroll
         body.style.overscrollBehaviorY = prevBodyOverscroll
      }
   }, [lockDocumentScroll])

   return (
      <div className="flex min-h-dvh max-h-dvh flex-col overflow-hidden">
         {!isAdmin ? <Navigation /> : null}
         <div
            className={cn(
               'flex min-h-0 min-w-0 flex-1 flex-col',
               lockDocumentScroll ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain',
            )}
         >
            {children}
         </div>
      </div>
   )
}
