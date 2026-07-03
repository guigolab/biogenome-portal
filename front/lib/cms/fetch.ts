import { getApiBase } from '@/lib/api/taxon'
import { getCookie } from '@/lib/cms/cookie'

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

export type CmsFetchError = Error & {
   status: number
   data?: unknown
}

function parseErrorBody(text: string): unknown {
   const trimmed = text.trim()
   if (!trimmed) return undefined
   try {
      return JSON.parse(trimmed) as unknown
   } catch {
      return trimmed
   }
}

function messageFromErrorBody(body: unknown, fallback: string): string {
   if (typeof body === 'string' && body.trim()) return body.trim()
   if (body && typeof body === 'object') {
      const d = body as Record<string, unknown>
      if (typeof d.message === 'string' && d.message.trim()) return d.message
      if (typeof d.description === 'string' && d.description.trim()) return d.description
      if (typeof d.detail === 'string' && d.detail.trim()) return d.detail
   }
   return fallback
}

/** Throw a structured error from a non-OK Response (JSON body attached as `.data`). */
export async function throwCmsFetchError(res: Response, fallback?: string): Promise<never> {
   const text = await res.text().catch(() => '')
   const data = parseErrorBody(text)
   const msg = messageFromErrorBody(data, fallback ?? `${res.status} ${res.statusText}`)
   const err = new Error(msg) as CmsFetchError
   err.status = res.status
   if (data !== undefined) err.data = data
   throw err
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
   if (!res.ok) await throwCmsFetchError(res)
   return res.json() as Promise<T>
}

export async function cmsFetchBlob(path: string, init: CmsFetchOptions = {}): Promise<Blob> {
   const res = await cmsFetch(path, init)
   if (!res.ok) await throwCmsFetchError(res)
   return res.blob()
}

/** Like cmsFetch but throws structured CmsFetchError when !res.ok. */
export async function cmsFetchOrThrow(path: string, init: CmsFetchOptions = {}): Promise<Response> {
   const res = await cmsFetch(path, init)
   if (!res.ok) await throwCmsFetchError(res)
   return res
}
