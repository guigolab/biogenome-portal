import type { NextRequest } from 'next/server'

import { resolveApiBaseForMiddleware } from '@/lib/portal/apiRuntime'

export type PortalMiddlewareFlags = {
   cms: boolean
   /** Normalized path or absolute URL from portal `general.apiBase` */
   apiBase: string
}

type CacheEntry = { at: number; flags: PortalMiddlewareFlags }

let cache: CacheEntry | null = null
const TTL_MS = 45_000

function portalJsonUrl(request: NextRequest): string {
   const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
   const path = base ? `${base}/portal.json` : '/portal.json'
   return new URL(path, request.nextUrl.origin).href
}

/**
 * Reads `general.cms` and `general.apiBase` from portal.json with a short in-memory TTL.
 */
export async function getCachedPortalFlags(request: NextRequest): Promise<PortalMiddlewareFlags | null> {
   const now = Date.now()
   if (cache && now - cache.at < TTL_MS) {
      return cache.flags
   }

   try {
      const res = await fetch(portalJsonUrl(request), { cache: 'no-store' })
      if (!res.ok) return null
      const json = (await res.json()) as { general?: { cms?: boolean; apiBase?: string } }
      const general = json?.general
      const rawBase =
         typeof general?.apiBase === 'string' && general.apiBase.trim().length > 0
            ? general.apiBase.trim().replace(/\/$/, '')
            : '/api'
      const flags: PortalMiddlewareFlags = {
         cms: general?.cms === true,
         apiBase: rawBase,
      }
      cache = { at: now, flags }
      return flags
   } catch {
      return null
   }
}

export function sessionProbeUrl(request: NextRequest, apiBase: string): string {
   const base = resolveApiBaseForMiddleware(apiBase, request.nextUrl.origin)
   return `${base}/login`
}
