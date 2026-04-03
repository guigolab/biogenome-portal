import { getApiBase } from '@/lib/api/taxon'
import { getCookie } from '@/lib/cms/cookie'

const AUTH_STORAGE_KEY = 'auth'

let handling401 = false
let on401: (() => void) | null = null

export function registerCms401Handler(handler: (() => void) | null) {
   on401 = handler
}

function loginPath(): string {
   const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
   const normalized = base.endsWith('/') ? base.slice(0, -1) : base
   return `${normalized}/login`
}

export type CmsFetchOptions = RequestInit & {
   /** When true, do not run 401 side effects (e.g. login POST). */
   skipAuthRedirect?: boolean
}

/**
 * Authenticated fetch to the portal API: credentials + CSRF header (matches Vue submission client).
 */
export async function cmsFetch(path: string, init: CmsFetchOptions = {}): Promise<Response> {
   const base = getApiBase()
   const url = path.startsWith('http')
      ? path
      : `${base}${path.startsWith('/') ? path : `/${path}`}`

   const headers = new Headers(init.headers)
   const csrf = getCookie('csrf_access_token')
   if (csrf) headers.set('X-CSRF-TOKEN', csrf)
   if (!headers.has('Accept')) headers.set('Accept', 'application/json')

   const body = init.body
   if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
   }

   const { skipAuthRedirect, ...rest } = init
   const res = await fetch(url, {
      ...rest,
      headers,
      credentials: 'include',
   })

   if (res.status === 401 && !skipAuthRedirect && typeof window !== 'undefined') {
      if (!handling401) {
         handling401 = true
         try {
            localStorage.setItem(AUTH_STORAGE_KEY, 'false')
            on401?.()
            if (!window.location.pathname.endsWith('/login')) {
               window.location.href = loginPath()
            }
         } finally {
            handling401 = false
         }
      }
   }

   return res
}

export async function cmsFetchJson<T>(path: string, init: CmsFetchOptions = {}): Promise<T> {
   const res = await cmsFetch(path, init)
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || `${res.status} ${res.statusText}`)
   }
   return res.json() as Promise<T>
}

export async function cmsFetchBlob(path: string, init: CmsFetchOptions = {}): Promise<Blob> {
   const res = await cmsFetch(path, init)
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || `${res.status} ${res.statusText}`)
   }
   return res.blob()
}
