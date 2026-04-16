import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getPortalFlags, sessionProbeUrl } from '@/lib/cms/middleware-portal'

function withBasePath(path: string): string {
   const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
   const p = path.startsWith('/') ? path : `/${path}`
   return bp ? `${bp}${p}` : p
}

async function sessionOk(request: NextRequest, apiBase: string): Promise<boolean> {
   const url = sessionProbeUrl(request, apiBase)
   const cookie = request.headers.get('cookie') ?? ''
   try {
      const res = await fetch(url, {
         method: 'GET',
         headers: {
            Accept: 'application/json',
            ...(cookie ? { Cookie: cookie } : {}),
         },
         cache: 'no-store',
      })
      return res.ok
   } catch {
      return false
   }
}

export async function middleware(request: NextRequest) {
   const flags = getPortalFlags(request)

   if (!flags.cms) {
      return NextResponse.redirect(new URL(withBasePath('/'), request.nextUrl.origin))
   }

   const pathname = request.nextUrl.pathname
   const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
   const isLogin = pathname === '/login'

   if (isAdmin) {
      const ok = await sessionOk(request, flags.apiBase)
      if (!ok) {
         return NextResponse.redirect(new URL(withBasePath('/login'), request.nextUrl.origin))
      }
      return NextResponse.next()
   }

   if (isLogin) {
      const ok = await sessionOk(request, flags.apiBase)
      if (ok) {
         return NextResponse.redirect(new URL(withBasePath('/admin'), request.nextUrl.origin))
      }
      return NextResponse.next()
   }

   return NextResponse.next()
}

export const config = {
   matcher: ['/admin', '/admin/:path*', '/login'],
}
