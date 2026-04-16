import type { NextRequest } from 'next/server'

import { resolveApiBaseForMiddleware } from '@/lib/portal/apiRuntime'

export type PortalMiddlewareFlags = {
   cms: boolean
   /** Normalized path or absolute URL from portal `general.apiBase` */
   apiBase: string
}

/**
 * Returns CMS flags for the middleware from build-time env vars baked into the
 * image by `scripts/bake-portal.mjs`. No runtime HTTP fetch to portal.json.
 *
 * NEXT_PUBLIC_CMS   — set to "true" when CMS is enabled (from PORTAL_CONFIG or NEXT_PUBLIC_CMS build-arg)
 * PORTAL_API_BASE   — API base path baked into the image; falls back to "/api"
 *
 * For local dev without a baked image, set NEXT_PUBLIC_CMS and PORTAL_API_BASE
 * in your .env.local (or they default to cms=false, apiBase=/api which is fine
 * for non-CMS dev).
 */
export function getPortalFlags(_request?: NextRequest): PortalMiddlewareFlags {
   const cmsEnv = process.env.NEXT_PUBLIC_CMS
   const cms = cmsEnv === 'true'

   const rawBase = process.env.PORTAL_API_BASE?.trim().replace(/\/$/, '') || '/api'
   return { cms, apiBase: rawBase }
}

export function sessionProbeUrl(request: NextRequest, apiBase: string): string {
   const base = resolveApiBaseForMiddleware(apiBase, request.nextUrl.origin)
   return `${base}/login`
}
