'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const MATOMO_URL = (process.env.NEXT_PUBLIC_MATOMO_URL ?? '').replace(/\/$/, '')
const MATOMO_SITE_ID = parseInt(process.env.NEXT_PUBLIC_MATOMO_SITE_ID ?? '1', 10) || 1

/** Declare Matomo push queue on window so TypeScript is happy. */
declare global {
   interface Window {
      _paq?: Array<unknown[]>
   }
}

function push(...args: unknown[]): void {
   if (typeof window === 'undefined') return
   window._paq = window._paq ?? []
   window._paq.push(args)
}

/**
 * Tracks page views on App Router navigations, mirroring the Vue/Vite
 * VueMatomo integration (`requireConsent: false`, `siteId` defaulting to 1).
 * Rendered only when NEXT_PUBLIC_MATOMO_URL is non-empty.
 */
export function MatomoPageTracker() {
   const pathname = usePathname()
   const searchParams = useSearchParams()

   useEffect(() => {
      const url = searchParams.size > 0 ? `${pathname}?${searchParams.toString()}` : pathname
      push('setCustomUrl', url)
      push('setDocumentTitle', document.title)
      push('trackPageView')
   }, [pathname, searchParams])

   return null
}

/**
 * Injects the Matomo tracker script and initializes the push queue.
 * Mount once in layout; renders nothing when NEXT_PUBLIC_MATOMO_URL is unset.
 */
export function MatomoTracker() {
   if (!MATOMO_URL) return null

   const trackerUrl = `${MATOMO_URL}/matomo.php`
   const scriptUrl = `${MATOMO_URL}/matomo.js`

   const initScript = `
    var _paq = window._paq = window._paq || [];
    _paq.push(['requireConsent'.replace('require','disable').replace('Consent','Cookies'), false]);
    _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);
    _paq.push(['setTrackerUrl', '${trackerUrl}']);
    _paq.push(['setSiteId', '${MATOMO_SITE_ID}']);
  `.trim()

   return (
      <>
         <Script id="matomo-init" strategy="afterInteractive">
            {initScript}
         </Script>
         <Script
            id="matomo-script"
            src={scriptUrl}
            strategy="afterInteractive"
            async
         />
         <MatomoPageTracker />
      </>
   )
}
