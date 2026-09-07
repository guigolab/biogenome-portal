import type { Metadata } from 'next'
import { Geist } from 'next/font/google'

import { AppChrome } from '@/components/app-chrome'
import { MatomoTracker } from '@/components/matomo-tracker'
import { Providers } from '@/components/providers'
import { metadataFaviconIcon } from '@/lib/portal/footerLogoPublicUrl'
import { defaultPortalConfig, normalizePortalConfig, normalizeUiColors } from '@/lib/portal'
import { portalSiteDescription, portalSiteTitle } from '@/lib/portal/portalDocumentMetadata'
import { loadPortalConfig } from '@/lib/portal/portalServer'
import { portalThemeStyleProps } from '@/lib/portal/themeApply'

import './globals.css'

const geist = Geist({ subsets: ['latin'] })

// Metadata only (title/description/favicon): cheap, has its own fallback chain, so it can stay
// server-rendered. Revalidate every 30s (matches the backend fetch's own cache window) so a
// newly mounted portal.json is picked up without a rebuild.
export const revalidate = 30

export async function generateMetadata(): Promise<Metadata> {
   const portal = await loadPortalConfig()
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

// Compiled-default brand style for first paint — zero I/O, no backend/network wait. The real
// per-instance branding (and root taxid) is fetched client-side on mount and swapped in by
// `PortalProvider` (see `applyPortalThemeToDocument` in `lib/portal/themeApply.ts`); light/dark
// mode is unaffected — that's handled separately by `next-themes` in `AppThemeProvider`.
const defaultAppConfig = normalizePortalConfig(defaultPortalConfig, normalizeUiColors)
const defaultThemeStyle = portalThemeStyleProps(defaultAppConfig, defaultPortalConfig)

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode
}>) {
   return (
      <html lang="en" suppressHydrationWarning style={defaultThemeStyle}>
         <body className={`${geist.className} font-sans antialiased`}>
            <Providers>
               <AppChrome>{children}</AppChrome>
            </Providers>
            <MatomoTracker />
         </body>
      </html>
   )
}
