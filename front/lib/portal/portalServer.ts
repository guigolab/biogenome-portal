import { readFile } from 'fs/promises'
import path from 'path'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { cache } from 'react'

import { fetchRootTaxid, getApiBase } from '@/lib/api/taxon'

import defaultPortalJson from './defaultPortal.json'
import type { PortalConfig } from './types'

const defaultPortalConfig = defaultPortalJson as PortalConfig

/** True only while `next build` is running its static-generation pass — never at request time. */
function isProductionBuildPhase(): boolean {
   return process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
}

/** `PORTAL_CONFIG_DIR` read fresh on every call (not inlined at build) so a container that omits it still checks `/config`. */
function resolvePortalConfigDir(): string {
   const raw = process.env.PORTAL_CONFIG_DIR
   return raw && raw.trim().length > 0 ? raw.trim() : '/config'
}

async function readPortalConfigFile(fp: string): Promise<PortalConfig | null> {
   try {
      const text = await readFile(fp, 'utf-8')
      return JSON.parse(text) as PortalConfig
   } catch {
      return null
   }
}

/**
 * Server-only: resolve the effective portal config at runtime, re-reading `process.env` and disk
 * on every call (nothing here is baked at build time). Resolution order:
 *   1. `${PORTAL_CONFIG_DIR}/portal.json` — bind-mounted per-instance config; `PORTAL_CONFIG_DIR`
 *      defaults to `/config` when unset, so a container that doesn't set it still checks
 *      `/config/portal.json`.
 *   2. `public/portal.json` — local dev / rollback path (e.g. after `npm run bake-portal`, or an
 *      older image that still baked at build time).
 *   3. The compiled `defaultPortal.json` — last-resort fallback so the app always renders even
 *      with nothing mounted and nothing baked.
 * Wrapped in React `cache()` for per-request dedup: re-reads once per request, so editing the
 * mounted file and restarting the container (no rebuild) is visible on the very next request.
 */
const loadPortalConfigFromDisk = cache(async (): Promise<PortalConfig> => {
   const mounted = await readPortalConfigFile(path.join(resolvePortalConfigDir(), 'portal.json'))
   if (mounted) return mounted

   const baked = await readPortalConfigFile(path.join(process.cwd(), 'public', 'portal.json'))
   if (baked) return baked

   return defaultPortalConfig
})

/**
 * Fetch the backend-authoritative portal config (`GET {INTERNAL_FETCH_ORIGIN}/api/portal`, see
 * `server/rest/portal.py` / `server/services/portal_config.py`), via `getApiBase()` — the same
 * server-side choke point `fetchRootTaxid()` uses, which resolves to `INTERNAL_FETCH_ORIGIN + '/api'`
 * (see `resolveApiBaseForFetch()` in `apiRuntime.ts`). Uses Next's data cache with a revalidate
 * window matching the backend's own `Cache-Control: public, max-age=30`, tagged `'portal'` so a
 * future on-demand revalidation (`revalidateTag('portal')`) can bust it immediately.
 */
async function fetchPortalConfigFromBackend(): Promise<PortalConfig> {
   const base = getApiBase()
   const url = `${base}/portal`
   const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 30, tags: ['portal'] },
   })
   if (!res.ok) {
      throw new Error(`GET ${url}: ${res.status} ${res.statusText}`)
   }
   return res.json() as Promise<PortalConfig>
}

/**
 * Server-only: the *primary* path for resolving portal config (front-config-centralization-plan.md
 * Phase 4 — the backend is the configuration authority). Tries the backend first; on any failure
 * (network error, non-200, backend unreachable during boot) falls back through the existing
 * Phase 3 chain (`loadPortalConfigFromDisk()`: mounted file → `public/portal.json` → compiled
 * default) rather than failing the page render. Logs a clear, visible warning on fallback so an
 * operator can tell from container logs which source served a given request.
 *
 * During `next build` (`NEXT_PHASE === phase-production-build`) returns the compiled default
 * immediately — no network or disk I/O — so static generation cannot hang when the backend is
 * unreachable. At request time (`phase-production-server`) the full backend → disk chain runs.
 *
 * Wrapped in React `cache()` for per-request dedup, same pattern as `loadPortalConfigFromDisk()`
 * and `loadRootTaxid()`.
 */
export const loadPortalConfig = cache(async (): Promise<PortalConfig> => {
   if (isProductionBuildPhase()) {
      return defaultPortalConfig
   }
   try {
      return await fetchPortalConfigFromBackend()
   } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(
         `[portal] backend /api/portal unreachable or invalid (${message}); falling back to ` +
            'the Phase 3 file-based resolution chain (mounted PORTAL_CONFIG_DIR → public/portal.json → compiled default).',
      )
      return loadPortalConfigFromDisk()
   }
})

/**
 * Server-only: resolve the portal root taxid from the backend (`GET /taxons/root`, driven by
 * the Flask `ROOT_NODE` env var), once per request. Falls back to `defaultPortal.json`'s
 * hardcoded `"131567"` when the backend is unreachable, non-200, or errors — a fetch failure
 * here must never break page rendering.
 *
 * Same build-phase short-circuit as `loadPortalConfig()` so static generation never awaits
 * an unreachable backend.
 */
export const loadRootTaxid = cache(async (): Promise<string> => {
   if (isProductionBuildPhase()) {
      return '131567'
   }
   try {
      return await fetchRootTaxid()
   } catch {
      return '131567'
   }
})
