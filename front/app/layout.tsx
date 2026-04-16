import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Geist } from 'next/font/google'

import { AppChrome } from '@/components/app-chrome'
import { MatomoTracker } from '@/components/matomo-tracker'
import { Providers } from '@/components/providers'
import { applyPortalGeneralRuntime } from '@/lib/portal/apiRuntime'
import { metadataFaviconIcon } from '@/lib/portal/footerLogoPublicUrl'
import { normalizePortalConfig, normalizeUiColors } from '@/lib/portal'
import { portalSiteDescription, portalSiteTitle } from '@/lib/portal/portalDocumentMetadata'
import { loadPortalConfigFromDisk } from '@/lib/portal/portalServer'
import { portalThemeStyleProps } from '@/lib/portal/themeApply'

import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
   const portal = await loadPortalConfigFromDisk()
   const siteTitle = portalSiteTitle(portal)
   const siteDescription = portalSiteDescription(portal)
   const favicon = metadataFaviconIcon(portal?.footer?.logoUrl)

   return {
      title: {
         default: siteTitle,
         template: `%s · ${siteTitle}`,
      },
      description: siteDescription ?? 'Explore biodiversity through genomics',
      icons: { icon: [favicon] },
   }
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
         <body className={`${geist.className} font-sans antialiased`}>
            <Providers initialPortal={portal ?? undefined}>
               <AppChrome>{children}</AppChrome>
            </Providers>
            <MatomoTracker />
         </body>
      </html>
   )
}
