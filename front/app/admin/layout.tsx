import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AdminLayoutClient } from '@/components/cms/admin-layout-client'
import { loadPortalConfig } from '@/lib/portal/portalServer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
   title: 'Admin',
}

/**
 * CMS-enabled gate (front-config-centralization-plan.md Phase 5): `general.cms` from
 * `loadPortalConfig()` is the single source of truth for whether `/admin` is reachable at all.
 * This layout wraps every route under `app/admin/**` (Next.js applies a segment's layout to all
 * of its nested pages), so there is no per-route bypass. Runs before `AdminLayoutClient` mounts,
 * so a disabled portal never renders (or session-probes) the admin shell. The existing
 * authentication check in `AdminLayoutClient` (JWT session probe, redirect to `/login` on
 * failure) is unchanged.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
   const portal = await loadPortalConfig()
   if (portal.general?.cms !== true) {
      redirect('/')
   }
   return <AdminLayoutClient>{children}</AdminLayoutClient>
}
