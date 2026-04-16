'use client'

import {
   createContext,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useState,
   type ReactNode,
} from 'react'

import {
   applyPortalThemeToDocument,
   clearPortalThemeInlineStyles,
   defaultPortalConfig,
   fetchPortalConfig,
   normalizePortalConfig,
   normalizeUiColors,
   type AppConfig,
   type PortalConfig,
} from '@/lib/portal'
import { applyPortalGeneralRuntime } from '@/lib/portal/apiRuntime'

type PortalContextValue = {
   config: AppConfig | null
   raw: PortalConfig | null
   loading: boolean
   error: string | null
   reload: () => Promise<void>
}

const PortalContext = createContext<PortalContextValue | null>(null)

type PortalProviderProps = {
   children: ReactNode
   /**
    * Server-loaded portal config passed from RootLayout so the client
    * initializes synchronously — no loading flash, no extra fetch.
    * Falls back to a client-side fetch when omitted (e.g. Storybook, tests).
    */
   initialPortal?: PortalConfig
}

function buildAppConfig(raw: PortalConfig) {
   applyPortalGeneralRuntime(raw.general)
   return normalizePortalConfig(raw, normalizeUiColors)
}

export function PortalProvider({ children, initialPortal }: PortalProviderProps) {
   const [config, setConfig] = useState<AppConfig | null>(
      () => (initialPortal ? buildAppConfig(initialPortal) : null),
   )
   const [raw, setRaw] = useState<PortalConfig | null>(initialPortal ?? null)
   const [loading, setLoading] = useState(!initialPortal)
   const [error, setError] = useState<string | null>(null)

   const load = useCallback(async () => {
      setLoading(true)
      setError(null)
      let rawConfig: PortalConfig
      try {
         rawConfig = await fetchPortalConfig()
      } catch (e) {
         const msg = e instanceof Error ? e.message : String(e)
         setError(msg)
         rawConfig = defaultPortalConfig
      }
      const app = buildAppConfig(rawConfig)
      setRaw(rawConfig)
      setConfig(app)
      setLoading(false)
   }, [])

   // When no initialPortal is provided (dev / fallback), fetch on mount.
   useEffect(() => {
      if (!initialPortal) {
         void load()
      }
   }, [initialPortal, load])

   useEffect(() => {
      if (!config || typeof document === 'undefined') return
      applyPortalThemeToDocument(document.documentElement, config, raw)
      return () => {
         clearPortalThemeInlineStyles(document.documentElement)
      }
   }, [config, raw])

   const value = useMemo(
      () => ({
         config,
         raw,
         loading,
         error,
         reload: load,
      }),
      [config, raw, loading, error, load],
   )

   return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortalConfig(): PortalContextValue {
   const ctx = useContext(PortalContext)
   if (!ctx) throw new Error('usePortalConfig must be used within PortalProvider')
   return ctx
}
