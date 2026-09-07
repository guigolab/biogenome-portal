import { redirect } from 'next/navigation'

import { loadPortalConfig } from '@/lib/portal/portalServer'

import { LoginPageClient } from './login-page-client'

export const dynamic = 'force-dynamic'

/**
 * CMS-enabled gate (front-config-centralization-plan.md Phase 5): `general.cms` from
 * `loadPortalConfig()` is the single source of truth for whether `/login` is reachable at all —
 * same source and same check as `app/admin/layout.tsx`. Redirects before the client login form
 * (and its own session probe) ever mounts. The login flow itself is unchanged in
 * `login-page-client.tsx`.
 */
export default async function LoginPage() {
   const portal = await loadPortalConfig()
   if (portal.general?.cms !== true) {
      redirect('/')
   }
   return <LoginPageClient />
}
