import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

import { AppChrome } from '@/components/app-chrome'
import { Providers } from '@/components/providers'
import { applyPortalGeneralRuntime } from '@/lib/portal/apiRuntime'
import { normalizePortalConfig, normalizeUiColors } from '@/lib/portal'
import { loadPortalConfigFromDisk } from '@/lib/portal/portalServer'
import { portalThemeStyleProps } from '@/lib/portal/themeApply'

import './globals.css'

const geist = Geist({ subsets: ['latin'] })
const geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
   title: 'BioGenome Portal',
   description: 'Explore biodiversity through genomics',
   icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
   },
}

export default async function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode
}>) {
   const portal = await loadPortalConfigFromDisk()
   applyPortalGeneralRuntime(portal?.general ?? null)

   let htmlThemeStyle: CSSProperties | undefined
   if (portal) {
      try {
         const app = normalizePortalConfig(portal, normalizeUiColors)
         htmlThemeStyle = portalThemeStyleProps(app, portal)
      } catch {
         htmlThemeStyle = undefined
      }
   }

   return (
      <html lang="en" suppressHydrationWarning style={htmlThemeStyle}>
         <body className={`${geist.className} ${geistMono.variable} font-sans antialiased`}>
            <Providers>
               <AppChrome>{children}</AppChrome>
            </Providers>
            <Analytics />
         </body>
      </html>
   )
}
